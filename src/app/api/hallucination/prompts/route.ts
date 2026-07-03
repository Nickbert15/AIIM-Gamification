import { callKiconnect, extractJson } from '@/lib/kiconnect'

interface RequestBody {
  learningObjective: string
  topic?: string
  difficulty: string
}

export async function POST(request: Request) {
  try {
    const { learningObjective, topic, difficulty } = (await request.json()) as RequestBody

    const systemPrompt = `Du hilfst dabei, ein "Hallucination Spotter"-Lernspiel für Finance & Controlling bei der Lufthansa Group zu entwickeln. Der Spieler wählt später einen von mehreren Prompt-Vorschlägen zum selben Thema aus, um zu üben, wie man gute Prompts erkennt.

Schreibe 3 vollständige, unterschiedlich gute Prompts, die man an einen KI-Assistenten schicken könnte, passend zu:
- Lernziel: ${learningObjective}
- Thema: ${topic || 'frei wählbar'}
- Schwierigkeit: ${difficulty}

Genau EINER der 3 Prompts soll klar der beste sein (spezifisch, eindeutig, mit klarem Kontext). Die anderen sollen plausibel, aber merklich schwächer sein (zu vage, zu offen, fehlender Kontext, o.ä.). Jeder Prompt braucht eine kurze Kritik (critique), die erklärt, warum er gut oder schwach ist.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne weiteren Text:
{
  "prompts": [
    {"text": "...", "isRecommended": true, "critique": "..."},
    {"text": "...", "isRecommended": false, "critique": "..."},
    {"text": "...", "isRecommended": false, "critique": "..."}
  ]
}`

    const raw = await callKiconnect(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generiere die Prompt-Vorschläge.' },
      ],
      0.8
    )

    const parsed = JSON.parse(extractJson(raw)) as {
      prompts: { text: string; isRecommended: boolean; critique: string }[]
    }
    if (!Array.isArray(parsed.prompts) || parsed.prompts.length === 0) {
      throw new Error('KI-Antwort enthielt keine gültige Prompt-Liste')
    }

    const prompts = parsed.prompts.map((p, i) => ({ id: i + 1, ...p }))

    return Response.json({ prompts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
