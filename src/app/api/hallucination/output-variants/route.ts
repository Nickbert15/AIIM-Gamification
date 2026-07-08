import { callKiconnect, extractJson } from '@/lib/kiconnect'

interface RequestBody {
  learningObjective: string
  topic?: string
  difficulty: string
  situation: string
}

interface GeneratedSentence {
  text: string
  isHallucination: boolean
  explanation: string
}

export async function POST(request: Request) {
  try {
    const { learningObjective, topic, difficulty, situation } = (await request.json()) as RequestBody

    const systemPrompt = `Du erstellst Inhalte für ein "Hallucination Spotter"-Lernspiel für Finance & Controlling bei der Lufthansa Group.

Situation: ${situation}
Lernziel: ${learningObjective}
Thema: ${topic || 'frei wählbar'}
Schwierigkeit: ${difficulty}

Schreibe EINEN zusammenhängenden, fließenden Text als KI-Antwort auf diese Situation, ca. 450-600 Wörter, aufgeteilt in 20-30 einzelne Sätze. GENAU 3 bis 6 dieser Sätze sollen erfundene, aber plausibel klingende Halluzinationen sein (falsche Zahlen, ein erfundenes Gesetz, eine erfundene Institution o.ä.), der Rest muss fachlich korrekt und für den Finance-Kontext plausibel sein. Prüfe die korrekten Sätze selbst auf Richtigkeit, bevor du sie ausgibst. Jeder Satz braucht eine kurze Erklärung (explanation) in einfacher Alltagssprache, warum er korrekt bzw. erfunden ist.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne weiteren Text:
{"sentences": [{"text": "...", "isHallucination": false, "explanation": "..."}, {"text": "...", "isHallucination": true, "explanation": "..."}]}`

    const raw = await callKiconnect(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generiere den vollständigen Antworttext als Satzliste.' },
      ],
      0.8
    )

    const parsed = JSON.parse(extractJson(raw)) as { sentences: GeneratedSentence[] }
    if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
      throw new Error('KI-Antwort enthielt keine gültigen Sätze')
    }

    const sentences = parsed.sentences.map((s, i) => ({ id: i + 1, ...s }))

    return Response.json({ sentences })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
