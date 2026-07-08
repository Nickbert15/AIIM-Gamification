import { callKiconnect, extractJson } from '@/lib/kiconnect'

interface RequestBody {
  learningObjective: string
  topic?: string
  difficulty: string
}

const APPROACHES = ['vage', 'kontext', 'rolle', 'quellen', 'suggestiv'] as const

export async function POST(request: Request) {
  try {
    const { learningObjective, topic, difficulty } = (await request.json()) as RequestBody

    const systemPrompt = `Du hilfst dabei, ein "Hallucination Spotter"-Lernspiel für Finance & Controlling bei der Lufthansa Group zu entwickeln. Eine 60-jährige Mitarbeitende ohne KI-Erfahrung soll daraus lernen, wie Prompt-Formulierung die Zuverlässigkeit von KI-Antworten beeinflusst.

Schreibe GENAU 5 Prompts, die man zum selben Thema an einen KI-Assistenten schicken könnte, passend zu:
- Lernziel: ${learningObjective}
- Thema: ${topic || 'frei wählbar'}
- Schwierigkeit: ${difficulty}

Jeder Prompt muss ein anderes Prompt-Prinzip zeigen (dieses Prinzip kommt ins Feld "approach"):
- "vage": kurz und unspezifisch formuliert
- "kontext": nennt konkrete Aspekte/Rahmenbedingungen, die die Antwort eingrenzen
- "rolle": gibt der KI eine Rolle/Perspektive vor
- "quellen": bittet die KI explizit, unsichere Angaben zu kennzeichnen statt sie als Fakt darzustellen (das ist prinzipiell der zuverlässigste Ansatz)
- "suggestiv": enthält eine falsche oder führende Prämisse, die die KI zum Miterfinden verleiten könnte

Vergib jedem Prompt einen "quality"-Wert von 0-100 (wie zuverlässig die Antwort darauf vermutlich wäre) und einen "feedback"-Text (2-3 Sätze in einfacher Alltagssprache, warum der Prompt so gut oder schlecht ist). Genau der Prompt mit dem höchsten quality-Wert bekommt "isRecommended": true, alle anderen "isRecommended": false.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne weiteren Text:
{
  "situation": "Ein Kollege fragt dich: '...'",
  "prompts": [
    {"text": "...", "approach": "vage", "quality": 30, "isRecommended": false, "feedback": "..."},
    {"text": "...", "approach": "kontext", "quality": 60, "isRecommended": false, "feedback": "..."},
    {"text": "...", "approach": "rolle", "quality": 65, "isRecommended": false, "feedback": "..."},
    {"text": "...", "approach": "quellen", "quality": 90, "isRecommended": true, "feedback": "..."},
    {"text": "...", "approach": "suggestiv", "quality": 15, "isRecommended": false, "feedback": "..."}
  ]
}`

    const raw = await callKiconnect(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generiere die Situation und die 5 Prompt-Vorschläge.' },
      ],
      0.8
    )

    const parsed = JSON.parse(extractJson(raw)) as {
      situation: string
      prompts: { text: string; approach: (typeof APPROACHES)[number]; quality: number; isRecommended: boolean; feedback: string }[]
    }
    if (!Array.isArray(parsed.prompts) || parsed.prompts.length === 0) {
      throw new Error('KI-Antwort enthielt keine gültige Prompt-Liste')
    }

    const prompts = parsed.prompts.map((p, i) => ({ id: i + 1, ...p }))

    return Response.json({ situation: parsed.situation, prompts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
