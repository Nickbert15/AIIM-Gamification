export async function POST(request: Request) {
  try {
    const { learningObjective, difficulty, topic, format } = await request.json()

    await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learning_objective: learningObjective, difficulty, topic, format }),
    })

    return Response.json({ success: true, message: 'Pipeline gestartet' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
