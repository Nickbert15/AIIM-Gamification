interface KiconnectResponse {
  choices: [{ message: { content: string } }]
}

export async function callKiconnect(
  messages: { role: string; content: string }[],
  temperature = 0.7
): Promise<string> {
  const res = await fetch(process.env.KICONNECT_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.KICONNECT_API_KEY!}`,
    },
    body: JSON.stringify({
      model: 'Mistral Small 3.2 24B Instruct 2506',
      messages,
      temperature,
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
