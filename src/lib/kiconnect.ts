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
  return (fenced ? fenced[1] : text).trim()
}
