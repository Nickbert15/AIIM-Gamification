import { recordAiProcessLog } from '@/lib/aiLog'

interface KiconnectMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface KiconnectResponse {
  choices: [{ message: { content: string } }]
}

type CallOptions = { temperature?: number; maxTokens?: number }

/** Context for the audit log (ai_process_logs). Without this parameter, the call is not logged. */
export interface AiLogContext {
  /** Short, stable identifier of the caller, e.g. "excel.execute", "game.regenerate". */
  source: string
  actorId?: string | null
  gameId?: string | null
  meta?: Record<string, unknown> | null
}

export async function callKiconnect(
  messages: KiconnectMessage[],
  temperatureOrOptions?: number | CallOptions,
  log?: AiLogContext
): Promise<string> {
  const options = typeof temperatureOrOptions === 'number' ? { temperature: temperatureOrOptions } : (temperatureOrOptions ?? {})
  // Model configurable via env; falls back to the previous default.
  const model = process.env.KICONNECT_MODEL ?? 'Mistral Small 3-2-24b Instruct KI:Inferenz.nrw'
  const startedAt = Date.now()

  try {
    const res = await fetch(process.env.KICONNECT_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KICONNECT_API_KEY!}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        // Without an explicit limit, the gateway default (often ~512-1024) kicks in and
        // truncates larger table JSON mid-array -> JSON.parse fails.
        max_tokens: options.maxTokens ?? 4096,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`kiconnect ${res.status}: ${body}`)
    }

    const data = (await res.json()) as KiconnectResponse
    const content = data.choices[0].message.content

    if (log) {
      await recordAiProcessLog({
        source: log.source,
        actorId: log.actorId,
        gameId: log.gameId,
        model,
        status: 'success',
        durationMs: Date.now() - startedAt,
        request: { messages, temperature: options.temperature ?? 0.3, maxTokens: options.maxTokens ?? 4096 },
        response: content,
        meta: log.meta,
      })
    }

    return content
  } catch (err) {
    if (log) {
      await recordAiProcessLog({
        source: log.source,
        actorId: log.actorId,
        gameId: log.gameId,
        model,
        status: 'error',
        durationMs: Date.now() - startedAt,
        request: { messages, temperature: options.temperature ?? 0.3, maxTokens: options.maxTokens ?? 4096 },
        errorMessage: err instanceof Error ? err.message : String(err),
        meta: log.meta,
      })
    }
    throw err
  }
}

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const unfenced = (fenced ? fenced[1] : text).trim()
  // Models sometimes prepend or append explanatory text around the JSON
  // object even without code fences. Slicing from the first "{" to the
  // matching last "}" tolerates that.
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return unfenced
  return unfenced.slice(start, end + 1)
}

// Strips ``` / ```json code fences some models wrap structured output in, then parses.
export function parseJsonResponse<T>(text: string): T {
  const cleaned = extractJson(text).trim()
  return JSON.parse(cleaned) as T
}
