import { getSessionToken, verifyToken } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateCustomInput } from '@/lib/inputValidation'
import { clarifyCustomInput } from '@/lib/inputClarification'

type Difficulty = 'easy' | 'medium' | 'hard'

interface GenerateRequest {
  technologyId: string
  technologyCustom: string | null
  learningGoal: string
  learningGoalCustom: string | null
  gameType: string
  difficulty: string
  acknowledgedWarning?: boolean
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(request: Request) {
  // requestedBy kommt aus der Session (JWT-Cookie), NICHT vom Client.
  // Fail-soft: der Admin-Bereich erzwingt (noch) keinen Login, daher kein 401 —
  // ohne gültige Session bleibt requestedBy null. TODO: strenger machen, sobald
  // es einen echten Admin-Login gibt.
  const token = getSessionToken()
  let requestedBy: string | null = null
  if (token) {
    try {
      requestedBy = await verifyToken(token)
    } catch {
      requestedBy = null
    }
  }

  let body: GenerateRequest
  try {
    body = (await request.json()) as GenerateRequest
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const errors: string[] = []

  // Technologie: entweder eine gesetzte technologyId, oder 'other' + Freitext.
  if (body.technologyId === 'other') {
    if (!isNonEmptyString(body.technologyCustom)) {
      errors.push('technologyCustom ist bei technologyId="other" erforderlich')
    }
  } else if (!isNonEmptyString(body.technologyId)) {
    errors.push('technologyId fehlt')
  }

  // Lernziel: entweder ein gesetzter Slug, oder 'other' + Freitext.
  if (body.learningGoal === 'other') {
    if (!isNonEmptyString(body.learningGoalCustom)) {
      errors.push('learningGoalCustom ist bei learningGoal="other" erforderlich')
    }
  } else if (!isNonEmptyString(body.learningGoal)) {
    errors.push('learningGoal fehlt')
  }

  if (body.gameType !== 'excel_challenge') {
    errors.push('gameType muss "excel_challenge" sein')
  }

  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) {
    errors.push('difficulty muss easy | medium | hard sein')
  }

  if (errors.length > 0) {
    return Response.json({ ok: false, error: errors.join('; ') }, { status: 400 })
  }

  // SCHICHT 1 — deterministischer Gate: Custom-Freitext strukturell prüfen.
  const customValidation = validateCustomInput(body)
  if (!customValidation.valid) {
    return Response.json(
      { needsInput: true, errors: customValidation.errors },
      { status: 400 }
    )
  }

  // SCHICHT 2 — LLM-Klärung: nur wenn ein Custom-Feld gesetzt ist und der
  // Nutzer eine warn-Meldung nicht bereits bewusst bestätigt hat.
  const hasCustomInput = body.technologyId === 'other' || body.learningGoal === 'other'
  if (hasCustomInput && !body.acknowledgedWarning) {
    const clarification = await clarifyCustomInput({
      technologyCustom: body.technologyId === 'other' ? body.technologyCustom : null,
      learningGoalCustom: body.learningGoal === 'other' ? body.learningGoalCustom : null,
    })

    if (clarification.verdict === 'block') {
      return Response.json({ verdict: 'block', message: clarification.message })
    }
    if (clarification.verdict === 'warn') {
      return Response.json({
        verdict: 'warn',
        message: clarification.message,
        suggestion: clarification.suggestion,
      })
    }
    // verdict "ok" → normal weiter.
  }

  // ── Grounding auflösen (server-seitig) ──
  // Bei gewählter Technologie label + whats_new aus der DB ziehen; bei "other"
  // den Freitext als Label nutzen.
  let technologyLabel: string | null = null
  let technologyWhatsNew: string | null = null

  if (body.technologyId === 'other') {
    technologyLabel = body.technologyCustom!.trim()
    technologyWhatsNew = null
  } else {
    const supabase = createServerClient()
    const { data: techRow } = await supabase
      .from('technologies')
      .select('label, whats_new')
      .eq('id', body.technologyId)
      .single()
    technologyLabel = techRow?.label ?? null
    technologyWhatsNew = techRow?.whats_new ?? null
  }

  // ── An n8n-Workflow "Game Generator: Excel" übergeben ──
  const webhookUrl = process.env.N8N_EXCEL_WEBHOOK_URL
  if (!webhookUrl) {
    return Response.json(
      { ok: false, stage: 'generation', errors: ['N8N_EXCEL_WEBHOOK_URL ist nicht konfiguriert'] },
      { status: 502 }
    )
  }

  const payload = {
    technologyId: body.technologyId,
    technologyCustom: body.technologyId === 'other' ? body.technologyCustom!.trim() : null,
    technologyLabel,
    technologyWhatsNew,
    learningGoal: body.learningGoal,
    learningGoalCustom: body.learningGoal === 'other' ? body.learningGoalCustom!.trim() : null,
    gameType: 'excel_challenge' as const,
    difficulty: body.difficulty as Difficulty,
    requestedBy,
  }

  // Großzügiger Timeout: die Generierung kann mehrere LLM-Calls dauern.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!res.ok) {
      return Response.json(
        { ok: false, stage: 'generation', errors: [`Webhook antwortete mit HTTP ${res.status}`] },
        { status: 502 }
      )
    }

    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; gameId?: string; errors?: unknown }
      | null

    if (data && data.ok === true && data.gameId) {
      return Response.json({ ok: true, gameId: data.gameId })
    }

    const webhookErrors = data?.errors ?? ['Generierung fehlgeschlagen']
    return Response.json({ ok: false, stage: 'generation', errors: webhookErrors }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Netzwerk-/Timeout-Fehler'
    return Response.json(
      { ok: false, stage: 'generation', errors: [message] },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
