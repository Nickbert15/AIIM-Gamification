interface KiconnectMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface KiconnectResponse {
  choices: [{ message: { content: string } }]
}

type CallOptions = { temperature?: number; maxTokens?: number }

export async function callKiconnect(
  messages: KiconnectMessage[],
  temperatureOrOptions?: number | CallOptions
): Promise<string> {
  const options = typeof temperatureOrOptions === 'number' ? { temperature: temperatureOrOptions } : (temperatureOrOptions ?? {})
  const res = await fetch(process.env.KICONNECT_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.KICONNECT_API_KEY!}`,
    },
    body: JSON.stringify({
      // Modell über Env steuerbar; Fallback = bisheriger Default.
      model: process.env.KICONNECT_MODEL ?? 'Mistral Small 3-2-24b Instruct KI:Inferenz.nrw',
      messages,
      temperature: options.temperature ?? 0.3,
      // Ohne explizites Limit greift der Gateway-Default (oft ~512-1024) und schneidet
      // größere Tabellen-JSONs mitten im Array ab → JSON.parse scheitert.
      max_tokens: options.maxTokens ?? 4096,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`kiconnect ${res.status}: ${body}`)
  }

  const data = (await res.json()) as KiconnectResponse
  return data.choices[0].message.content
}

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const unfenced = (fenced ? fenced[1] : text).trim()
  // LLMs sometimes prepend/append chatty text around the JSON object even
  // without code fences ("Hier ist das JSON: {...} Ich hoffe das hilft!").
  // Slicing from the first "{" to the matching last "}" tolerates that.
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
