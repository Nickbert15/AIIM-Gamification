import { supabase } from '@/lib/supabase'
import { callKiconnect, parseJsonResponse } from '@/lib/kiconnect'
import { validateExcelGeneration, GeneratedExcelChallenge } from '@/lib/excelValidation'

const DIFFICULTY_CONFIG: Record<string, { maxPoints: number; maxAttempts: number; operationHint: string }> = {
  beginner: {
    maxPoints: 100,
    maxAttempts: 3,
    operationHint: 'genau eine Operation (z.B. sortieren, filtern, oder Duplikate entfernen)',
  },
  intermediate: {
    maxPoints: 150,
    maxAttempts: 3,
    operationHint: '2-3 kombinierte Schritte (z.B. Daten bereinigen und danach eine berechnete Spalte ergänzen)',
  },
  advanced: {
    maxPoints: 200,
    maxAttempts: 4,
    operationHint: 'bedingte Logik, Aggregation/Gruppierung oder mehrstufige Transformationen, die nur mit einem präzisen Prompt gelingen',
  },
}

function buildSystemPrompt(operationHint: string): string {
  return `Du erstellst Trainingsaufgaben für eine "Excel-Prompt-Challenge": Mitarbeitende üben, präzise Prompts für Tabellen-Transformationen zu schreiben (wie Copilot in Excel).

Gehe dabei intern in zwei Schritten vor (nur das Endergebnis wird zurückgegeben):
1. Lege zuerst exakt fest, welche Tabellen-Operation(en) die Aufgabe verlangt (z. B. "sortiere nach Spalte X absteigend"). Daraus leitest du "solutionData" und "evaluationCriteria" ab — die bleiben präzise und deterministisch.
2. Formuliere daraus "task" NICHT als Anweisung, sondern als **Geschäftsszenario**: eine Arbeitssituation aus Sicht eines Kollegen/einer Kollegin oder einer Führungskraft mit einem konkreten Bedürfnis. Die Operation wird nur indirekt sichtbar, nie als Befehl.

Verboten in "task" (führt zur Ablehnung der gesamten Antwort):
- Operationsverben wie "sortiere", "lösche", "entferne", "filtere", "berechne", "gruppiere", "runde", "ergänze eine Spalte" (oder Varianten davon).
- Ein exakter Spaltenname direkt in Kombination mit der gewünschten Operation.

Beispiele für die Übersetzung Operation → Szenario:
- "sortiere absteigend nach Umsatz" → "sie möchte auf einen Blick sehen, welche Produkte am stärksten performen"
- "lösche Nullzeilen" → "im Export steckt noch Datenmüll, der die Auswertung verzerrt"
- "berechne die Marge" → "sie braucht die Kennzahl, die zeigt, was vom Umsatz übrig bleibt"

Weitere Regeln für "task":
- 3-6 Sätze, erzählerisch: wer braucht was, wofür, in welchem Kontext.
- Bei mittlerer/schwerer Schwierigkeit: mehrere implizite Schritte, die nirgends aufgezählt werden — der Spieler muss sie selbst erkennen.

Gib AUSSCHLIESSLICH ein einziges JSON-Objekt zurück, ohne Erklärtext, ohne Markdown-Codeblock, mit exakt diesen Feldern:
{
  "title": string,
  "task": string (das Geschäftsszenario auf Deutsch, wie oben beschrieben — KEINE Operationsanweisung),
  "topic": string,
  "initialData": { "headers": string[], "rows": (string|number|null)[][] },
  "solutionData": { "headers": string[], "rows": (string|number|null)[][] },
  "evaluationCriteria": [{ "id": string, "description": string (deutsch), "weight": number, "columns": string[] }],
  "evaluationConfig": { "rowOrderMatters": boolean, "columnOrderMatters": boolean, "numericTolerance": number },
  "samplePrompt": string (ein Beispiel für einen guten, präzisen Prompt, der die Aufgabe löst, deutsch)
}

Regeln:
- initialData: 15-60 Zeilen, 4-8 Spalten. solutionData: gleiche oder eine Teilmenge der Spalten, plausible Zeilenanzahl relativ zu initialData (nie mehr Zeilen als initialData, außer bei Gruppierung wird es typischerweise weniger).
- Ausschließlich synthetische, frei erfundene Daten (fiktive Namen, Kostenstellen, Abteilungen). Niemals reale Firmendaten oder reale Personen simulieren.
- Die zugrundeliegende Operation erfordert ${operationHint}.
- evaluationCriteria: jedes Kriterium muss "columns" enthalten, die exakt Spaltennamen aus solutionData.headers referenzieren. Die Gewichte ("weight") aller Kriterien müssen sich zu 1.0 summieren.
- Antworte NUR mit dem JSON-Objekt, keinem weiteren Text davor oder danach.`
}

export async function POST(request: Request) {
  try {
    const { learningObjective, difficulty, topic } = await request.json()
    const cfg = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.beginner

    const systemPrompt = buildSystemPrompt(cfg.operationHint)
    const baseUserPrompt = `Lernziel: ${learningObjective}\nThema: ${topic || '(kein spezifisches Thema angegeben, wähle etwas Passendes aus dem Controlling-Umfeld)'}\nSchwierigkeit: ${difficulty}`

    let parsed: GeneratedExcelChallenge | null = null
    let lastErrors: string[] = []

    for (let attempt = 0; attempt < 2; attempt++) {
      const userPrompt = attempt === 0
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nDeine vorherige Antwort hatte folgende Probleme, bitte korrigiere sie und antworte erneut nur mit dem JSON-Objekt: ${lastErrors.join('; ')}`

      let raw: string
      try {
        raw = await callKiconnect(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          { temperature: 0.5 }
        )
      } catch (err) {
        lastErrors = [err instanceof Error ? err.message : 'kiconnect-Aufruf fehlgeschlagen']
        continue
      }

      let candidate: unknown
      try {
        candidate = parseJsonResponse(raw)
      } catch {
        lastErrors = ['Antwort war kein gültiges JSON']
        continue
      }

      const validation = validateExcelGeneration(candidate)
      if (validation.valid) {
        parsed = candidate as GeneratedExcelChallenge
        break
      }
      lastErrors = validation.errors
    }

    if (!parsed) {
      return Response.json(
        { success: false, error: `Generierung fehlgeschlagen: ${lastErrors.join('; ')}` },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('games')
      .insert([{
        title: parsed.title,
        format: 'excel_prompt_challenge',
        difficulty,
        language: 'de',
        topic: topic || parsed.topic || null,
        learning_objective: learningObjective,
        status: 'draft',
        source_attribution: {
          generated_by: 'native-nextjs',
          model: 'Mistral Small 3-2-24b Instruct KI:Inferenz.nrw',
        },
        game_json: {
          format: 'excel_prompt_challenge',
          task: parsed.task,
          initialData: parsed.initialData,
          solutionData: parsed.solutionData,
          evaluationCriteria: parsed.evaluationCriteria,
          evaluationConfig: parsed.evaluationConfig,
          maxAttempts: cfg.maxAttempts,
          samplePrompt: parsed.samplePrompt,
          scoring: { maxPoints: cfg.maxPoints, passingScore: 60 },
        },
      }])
      .select('id')
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, gameId: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
