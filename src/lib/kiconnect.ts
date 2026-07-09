interface KiconnectMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface KiconnectResponse {
  choices: [{ message: { content: string } }]
}

export async function callKiconnect(
  messages: KiconnectMessage[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
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
      temperature: opts?.temperature ?? 0.3,
      // Ohne explizites Limit greift der Gateway-Default (oft ~512-1024) und schneidet
      // größere Tabellen-JSONs mitten im Array ab → JSON.parse scheitert.
      max_tokens: opts?.maxTokens ?? 4096,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`kiconnect ${res.status}: ${body}`)
  }

  const data = await res.json() as KiconnectResponse
  return data.choices[0].message.content
}

// Strips ``` / ```json code fences some models wrap structured output in, then parses.
export function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) cleaned = fenceMatch[1].trim()
  return JSON.parse(cleaned) as T
}
