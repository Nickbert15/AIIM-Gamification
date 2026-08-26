import { getSessionToken, verifyToken } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateCustomInput } from '@/lib/inputValidation'
import { clarifyCustomInput } from '@/lib/inputClarification'
import { recordAiProcessLog } from '@/lib/aiLog'

type Difficulty = 'easy' | 'medium' | 'hard'

// Canonical game-type values — identical to the games.format column.
type GameType = 'excel_challenge' | 'hallucination_spotter_v2' | 'prompt_arena' | 'prompt_branching'

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
const GAME_TYPES: GameType[] = ['excel_challenge', 'hallucination_spotter_v2', 'prompt_arena', 'prompt_branching']

// Each game type has its own n8n workflow. process.env is deliberately read with
// static keys (no process.env[dynamic]) so the Next build can still resolve the
// values.
function resolveWebhook(gameType: GameType): { envKey: string; url: string | undefined } {
  switch (gameType) {
    case 'excel_challenge':
      return { envKey: 'N8N_EXCEL_WEBHOOK_URL', url: process.env.N8N_EXCEL_WEBHOOK_URL }
    case 'hallucination_spotter_v2':
      return { envKey: 'N8N_HALLUCINATION_WEBHOOK_URL', url: process.env.N8N_HALLUCINATION_WEBHOOK_URL }
    case 'prompt_arena':
      return { envKey: 'N8N_ARENA_WEBHOOK_URL', url: process.env.N8N_ARENA_WEBHOOK_URL }
    case 'prompt_branching':
      return { envKey: 'N8N_BRANCHING_WEBHOOK_URL', url: process.env.N8N_BRANCHING_WEBHOOK_URL }
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(request: Request) {
  // requestedBy comes from the session (JWT cookie), NOT from the client.
  // Fail-soft: the admin area doesn't (yet) enforce login, so no 401 —
  // without a valid session requestedBy stays null. TODO: tighten this once
  // there's a real admin login.
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

  // Technology: either a set technologyId, or 'other' + free text.
  if (body.technologyId === 'other') {
    if (!isNonEmptyString(body.technologyCustom)) {
      errors.push('technologyCustom ist bei technologyId="other" erforderlich')
    }
  } else if (!isNonEmptyString(body.technologyId)) {
    errors.push('technologyId fehlt')
  }

  // Learning goal: either a set slug, or 'other' + free text.
  if (body.learningGoal === 'other') {
    if (!isNonEmptyString(body.learningGoalCustom)) {
      errors.push('learningGoalCustom ist bei learningGoal="other" erforderlich')
    }
  } else if (!isNonEmptyString(body.learningGoal)) {
    errors.push('learningGoal fehlt')
  }

  if (!GAME_TYPES.includes(body.gameType as GameType)) {
    errors.push(`gameType muss ${GAME_TYPES.map((t) => `"${t}"`).join(' | ')} sein`)
  }

  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) {
    errors.push('difficulty muss easy | medium | hard sein')
  }

  if (errors.length > 0) {
    return Response.json({ ok: false, error: errors.join('; ') }, { status: 400 })
  }

  // LAYER 1 — deterministic gate: structurally validate custom free text.
  const customValidation = validateCustomInput(body)
  if (!customValidation.valid) {
    return Response.json(
      { needsInput: true, errors: customValidation.errors },
      { status: 400 }
    )
  }

  // LAYER 2 — LLM clarification: only when a custom field is set and the
  // user hasn't already knowingly acknowledged a warn verdict.
  const hasCustomInput = body.technologyId === 'other' || body.learningGoal === 'other'
  if (hasCustomInput && !body.acknowledgedWarning) {
    const clarification = await clarifyCustomInput(
      {
        technologyCustom: body.technologyId === 'other' ? body.technologyCustom : null,
        learningGoalCustom: body.learningGoal === 'other' ? body.learningGoalCustom : null,
      },
      requestedBy
    )

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
    // verdict "ok" -> proceed normally.
  }

  // ── Resolve grounding (server-side) ──
  // For a selected technology, pull label + whats_new from the DB; for "other"
  // use the free text as the label.
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

  // ── Hand off to the n8n workflow for the given game type ──
  const gameType = body.gameType as GameType
  const { envKey, url: webhookUrl } = resolveWebhook(gameType)
  if (!webhookUrl) {
    return Response.json(
      { ok: false, stage: 'generation', errors: [`${envKey} ist nicht konfiguriert`] },
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
    gameType,
    difficulty: body.difficulty as Difficulty,
    requestedBy,
  }

  // Generous timeout: generation can take multiple LLM calls.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  const startedAt = Date.now()

  // The actual LLM generation runs in the n8n workflow (outside this repo) —
  // this only records the trigger + the result, not the prompt itself.
  async function logWebhookCall(status: 'success' | 'error', response: unknown, errorMessage?: string) {
    await recordAiProcessLog({
      source: 'game.generate.n8n',
      actorId: requestedBy,
      gameId: status === 'success' && response && typeof response === 'object' && 'gameId' in response
        ? (response as { gameId?: string }).gameId ?? null
        : null,
      status,
      durationMs: Date.now() - startedAt,
      request: payload,
      response,
      errorMessage,
      meta: { gameType, envKey },
    })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!res.ok) {
      const message = `Webhook antwortete mit HTTP ${res.status}`
      await logWebhookCall('error', null, message)
      return Response.json(
        { ok: false, stage: 'generation', errors: [message] },
        { status: 502 }
      )
    }

    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; gameId?: string; errors?: unknown }
      | null

    if (data && data.ok === true && data.gameId) {
      await logWebhookCall('success', data)
      return Response.json({ ok: true, gameId: data.gameId })
    }

    const webhookErrors = data?.errors ?? ['Generierung fehlgeschlagen']
    await logWebhookCall('error', data, JSON.stringify(webhookErrors))
    return Response.json({ ok: false, stage: 'generation', errors: webhookErrors }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Netzwerk-/Timeout-Fehler'
    await logWebhookCall('error', null, message)
    return Response.json(
      { ok: false, stage: 'generation', errors: [message] },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
