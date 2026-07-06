interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface KiconnectResponse {
  choices: [{ message: { content: string } }]
}

interface RequestBody {
  userPrompt: string
  systemPrompt: string
  history: Message[]
}

function extractFeedback(text: string): { response: string; feedback: string } {
  const match = text.match(/\[FEEDBACK\]([\s\S]*?)(?:\[\/FEEDBACK\]|$)/i)
  if (!match) return { response: text, feedback: '' }
  const feedback = match[1].trim()
  const response = text.replace(/\[FEEDBACK\][\s\S]*?(?:\[\/FEEDBACK\]|$)/i, '').trim()
  return { response, feedback }
}

export async function POST(request: Request) {
  try {
    const { userPrompt, systemPrompt, history } = await request.json() as RequestBody

    const res = await fetch(process.env.KICONNECT_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KICONNECT_API_KEY!}`,
      },
      body: JSON.stringify({
        model: 'Mistral Small 3-2-24b Instruct KI:Inferenz.nrw',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('kiconnect error:', res.status, body)
      return Response.json({ error: `kiconnect ${res.status}: ${body}` }, { status: 502 })
    }

    const data = await res.json() as KiconnectResponse
    const fullContent = data.choices[0].message.content
    const { response, feedback } = extractFeedback(fullContent)

    return Response.json({ response, feedback })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('kiconnect fetch failed:', error)
    return Response.json({ error }, { status: 500 })
  }
}
