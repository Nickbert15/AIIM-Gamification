import { callKiconnect } from '@/lib/kiconnect'

interface RequestBody {
  taskDescription: string
  systemContext: string
  userPrompt: string
}

export async function POST(request: Request) {
  try {
    const { taskDescription, systemContext, userPrompt } = (await request.json()) as RequestBody

    if (!userPrompt?.trim()) {
      return Response.json({ error: 'Kein Prompt übergeben' }, { status: 400 })
    }

    const systemPrompt = `${systemContext}\n\nAufgabe des Nutzers: ${taskDescription}\n\nAntworte direkt und ausschließlich auf den folgenden Prompt des Nutzers, so wie es ein hilfreicher Finance-KI-Assistent tun würde. Keine Meta-Kommentare über den Prompt selbst.`

    const response = await callKiconnect(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt.trim() },
      ],
      0.7
    )

    return Response.json({ response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
