import { callKiconnect, extractJson } from '@/lib/kiconnect'

interface RequestBody {
  taskDescription: string
  systemContext: string
  userPrompt: string
  ownAnswerText: string
  bestReferenceText: string
  bestReferenceNote: string
}

export async function POST(request: Request) {
  try {
    const { taskDescription, systemContext, userPrompt, ownAnswerText, bestReferenceText, bestReferenceNote } =
      (await request.json()) as RequestBody

    const systemPrompt = `Du bist ein Prompt-Engineering-Coach für Finance-Mitarbeiter bei der Lufthansa Group, die neu im Umgang mit KI sind. Erkläre alles in einfacher Alltagssprache.

Situation: ${systemContext}
Aufgabe: ${taskDescription}

Der Nutzer hat folgenden Prompt geschrieben: "${userPrompt}"
Die KI-Antwort darauf war: "${ownAnswerText}"

Eine besonders starke Referenzantwort auf dieselbe Aufgabe lautet: "${bestReferenceText}"
Warum diese Referenz stark ist: ${bestReferenceNote}

Bewerte, wie nah die Antwort des Nutzers an die starke Referenzantwort herankommt.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne weiteren Text:
{
  "scorePercent": 78,
  "explanation": "ein bis zwei Sätze, warum dieser Prozentwert",
  "whatWasGood": "ein Satz, was am Prompt des Nutzers schon gut war",
  "improvement": "ein konkreter Verbesserungsvorschlag für den Prompt, max. ein Satz",
  "comparison": "ein Satz, warum die Referenzantwort so stark ist bzw. wo die Nutzer-Antwort noch nicht mithält"
}`

    const raw = await callKiconnect(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Bewerte die Antwort im vorgegebenen JSON-Format.' },
      ],
      0.5
    )

    const parsed = JSON.parse(extractJson(raw)) as {
      scorePercent: number
      explanation: string
      whatWasGood: string
      improvement: string
      comparison: string
    }
    if (typeof parsed.scorePercent !== 'number') {
      throw new Error('KI-Antwort enthielt keine gültige Bewertung')
    }

    return Response.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
