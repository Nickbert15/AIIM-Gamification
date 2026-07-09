// SCHICHT 2 — LLM-Klärung von Admin-Freitexteingaben.
// Nutzt den bestehenden kiconnect-Helper (server-seitig, kein OpenAI, kein neuer Key).
// Fail-open: Infra-/Parse-Fehler dürfen den Admin nicht blockieren → verdict "ok".

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

export async function clarifyCustomInput(input: {
  technologyCustom?: string | null
  learningGoalCustom?: string | null
}): Promise<ClarifyResult> {
  const fields: string[] = []
  if (input.technologyCustom) fields.push(`technologyCustom: "${input.technologyCustom}"`)
  if (input.learningGoalCustom) fields.push(`learningGoalCustom: "${input.learningGoalCustom}"`)

  // Nichts gesetzt → nichts zu klären.
  if (fields.length === 0) return OK

  const userPrompt = `Bewerte die folgenden gesetzten Freitextfelder:\n${fields.join('\n')}`

  try {
    const raw = await callKiconnect(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2 }
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
    // fail-open: eine Infra-/Parse-Störung darf den Admin nicht blockieren.
    console.error('[clarifyCustomInput] fail-open, behandle als "ok":', err)
    return OK
  }
}
