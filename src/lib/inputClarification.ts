// LAYER 2 — LLM clarification of admin free-text input.
// Uses the existing kiconnect helper (server-side, no OpenAI, no new key).
// Fail-open: infra/parse errors must not block the admin -> verdict "ok".

import { callKiconnect, parseJsonResponse } from '@/lib/kiconnect'

export type ClarifyVerdict = 'ok' | 'warn' | 'block'

export interface ClarifyResult {
  verdict: ClarifyVerdict
  message: string
  suggestion: string | null
}

const SYSTEM_PROMPT = `Du prüfst Admin-Freitexteingaben für eine Lern-Spiel-Plattform.
technologyCustom soll eine plausible KI-Technologie/-Fähigkeit/-Tool sein.
learningGoalCustom soll ein plausibles Finance/Accounting-Lernthema sein.
Bewerte je gesetztes Feld. Gib AUSSCHLIESSLICH valides JSON zurück, keine Markdown-Blöcke:
{"verdict":"ok|warn|block","message":"<ein kurzer deutscher Satz>","suggestion":"<optional besserer Begriff oder null>"}
- ok: eindeutig plausibel
- warn: verständlich, aber ungenau/grenzwertig (z.B. sehr breit oder unsicher zuzuordnen) → nicht blockieren, nur Hinweis
- block: kein sinnvoller Begriff, leer von Bedeutung, oder klar themenfremd
Sei nicht bevormundend: obskure, aber plausible Technologienamen sind ok.`

const OK: ClarifyResult = { verdict: 'ok', message: '', suggestion: null }

function normalizeVerdict(v: unknown): ClarifyVerdict {
  return v === 'warn' || v === 'block' ? v : 'ok'
}

export async function clarifyCustomInput(
  input: {
    technologyCustom?: string | null
    learningGoalCustom?: string | null
  },
  actorId?: string | null
): Promise<ClarifyResult> {
  const fields: string[] = []
  if (input.technologyCustom) fields.push(`technologyCustom: "${input.technologyCustom}"`)
  if (input.learningGoalCustom) fields.push(`learningGoalCustom: "${input.learningGoalCustom}"`)

  // Nothing set -> nothing to clarify.
  if (fields.length === 0) return OK

  const userPrompt = `Bewerte die folgenden gesetzten Freitextfelder:\n${fields.join('\n')}`

  try {
    const raw = await callKiconnect(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2 },
      { source: 'admin.inputClarification', actorId, gameId: null, meta: input }
    )

    const parsed = parseJsonResponse<Partial<ClarifyResult>>(raw)
    const suggestion =
      typeof parsed.suggestion === 'string' && parsed.suggestion.trim().length > 0
        ? parsed.suggestion.trim()
        : null

    return {
      verdict: normalizeVerdict(parsed.verdict),
      message: typeof parsed.message === 'string' ? parsed.message : '',
      suggestion,
    }
  } catch (err) {
    // fail-open: an infra/parse hiccup must not block the admin.
    console.error('[clarifyCustomInput] fail-open, behandle als "ok":', err)
    return OK
  }
}
