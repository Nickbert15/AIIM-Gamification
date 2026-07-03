import { callKiconnect, extractJson } from '@/lib/kiconnect'

interface RequestBody {
  learningObjective: string
  topic?: string
  difficulty: string
  prompts: { id: number; text: string }[]
}

interface GeneratedLine {
  text: string
  isHallucination: boolean
  explanation: string
}

async function generateVariant(
  promptText: string,
  learningObjective: string,
  topic: string | undefined,
  difficulty: string
): Promise<GeneratedLine[]> {
  const systemPrompt = `Du erstellst Inhalte für ein "Hallucination Spotter"-Lernspiel für Finance & Controlling bei der Lufthansa Group.

Der Spieler hat folgenden Prompt an einen KI-Assistenten gestellt:
"${promptText}"

Lernziel: ${learningObjective}
Thema: ${topic || 'frei wählbar'}
Schwierigkeit: ${difficulty}

Schreibe die KI-Antwort auf diesen Prompt als 4-5 einzelne Aussagen-Zeilen. GENAU 1-2 der Zeilen sollen erfundene, aber plausibel klingende Halluzinationen sein (falsche Zahlen, erfundene Ereignisse/Beschlüsse, falsche fachliche Regeln), der Rest muss korrekt und fachlich plausibel für den Finance-Kontext sein. Jede Zeile braucht eine kurze Erklärung (explanation), warum sie korrekt bzw. eine Halluzination ist.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne weiteren Text:
{"lines": [{"text": "...", "isHallucination": false, "explanation": "..."}, {"text": "...", "isHallucination": true, "explanation": "..."}]}`

  const raw = await callKiconnect(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generiere die Aussagen-Zeilen.' },
    ],
    0.8
  )

  const parsed = JSON.parse(extractJson(raw)) as { lines: GeneratedLine[] }
  if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) {
    throw new Error('KI-Antwort enthielt keine gültigen Zeilen')
  }
  return parsed.lines
}

export async function POST(request: Request) {
  try {
    const { learningObjective, topic, difficulty, prompts } = (await request.json()) as RequestBody
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Keine Prompts übergeben')
    }

    const outputVariants = []
    for (const p of prompts) {
      const lines = await generateVariant(p.text, learningObjective, topic, difficulty)
      outputVariants.push({
        promptOptionId: p.id,
        lines: lines.map((l, i) => ({ id: i + 1, ...l })),
      })
    }

    return Response.json({ outputVariants })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
