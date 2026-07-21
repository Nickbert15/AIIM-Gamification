import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-server'
import { callKiconnect } from '@/lib/kiconnect'
import { CriterionResult, evaluateExcelChallenge, extractExcelChallengeData } from '@/lib/excelEvaluation'
import { computeExcelPoints } from '@/lib/excelScoring'
import { applyPlayGamification } from '@/lib/playerGamification'
import { ExcelTableState, GameJson } from '@/types/game'

const FEEDBACK_SYSTEM_PROMPT = `Du gibst kurzes, konstruktives Feedback auf Deutsch (2-3 Sätze) zu einer abgeschlossenen "Excel-Prompt-Challenge". Du bekommst die Aufgabenstellung, den erreichten Score in Prozent, und pro Kriterium ob es erfüllt wurde. Formuliere freundlich und konkret, was gut war und was noch fehlt. Gib NUR den Feedbacktext zurück, keine Überschriften, keine Aufzählungszeichen, keine Anführungszeichen.`

function buildFallbackFeedback(score: number, criteriaResults: CriterionResult[]): string {
  const passed = criteriaResults.filter(c => c.passed).map(c => c.description)
  const failed = criteriaResults.filter(c => !c.passed).map(c => c.description)
  let text = `Du hast ${score}% erreicht.`
  if (passed.length) text += ` Erfüllt: ${passed.join(', ')}.`
  if (failed.length) text += ` Noch offen: ${failed.join(', ')}.`
  return text
}

interface RequestBody {
  gameId: string
  playerId: string | null
  currentTable: ExcelTableState
  attemptsUsed: number
}

export async function POST(request: Request) {
  try {
    const { gameId, playerId, currentTable, attemptsUsed } = await request.json() as RequestBody

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('game_json')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return Response.json({ error: 'Spiel nicht gefunden' }, { status: 404 })
    }

    const challenge = extractExcelChallengeData(game.game_json as GameJson)
    const maxPoints = (game.game_json as GameJson).scoring?.maxPoints ?? 100

    const { score, criteriaResults } = evaluateExcelChallenge(currentTable, challenge)
    const pointsEarned = computeExcelPoints(score, attemptsUsed, challenge.maxAttempts, maxPoints)

    let feedback: string
    try {
      const userMessage = `Aufgabe: ${challenge.task}\nErreichter Score: ${score}%\nKriterien:\n${criteriaResults
        .map(c => `- ${c.description}: ${c.passed ? 'erfüllt' : 'nicht erfüllt'}`)
        .join('\n')}`
      feedback = await callKiconnect(
        [
          { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        { temperature: 0.6 }
      )
      feedback = feedback.trim()
      if (!feedback) throw new Error('leere Antwort')
    } catch {
      feedback = buildFallbackFeedback(score, criteriaResults)
    }

    if (playerId !== null) {
      // Service-Role: auf `scores` liegt RLS, der Anon-Client schrieb hier
      // stillschweigend nichts — Excel-Plays fehlten dadurch im Leaderboard.
      const { error: scoreError } = await supabaseAdmin
        .from('scores')
        // Leaderboard-Score einheitlich als Prozent (0–100) wie die anderen Spieltypen.
        // Der attempt-gewichtete pointsEarned bleibt nur für die Anzeige (Response unten).
        .insert([{ player_id: playerId, game_id: gameId, score: Math.round(score) }])
      if (scoreError) console.error('[excel/finish] Score-Insert fehlgeschlagen:', scoreError)
      // Punkte-Quelle laut Vorgabe: maxPoints des Spiels bei Bestehen (alle Kriterien
      // erfüllt), sonst 0 — bewusst NICHT das attempt-gewichtete `pointsEarned`,
      // das nur in die `scores`-Historie fließt.
      await applyPlayGamification(playerId, criteriaResults.every(c => c.passed) ? maxPoints : 0)
    }

    return Response.json({
      score,
      pointsEarned,
      criteriaResults,
      feedback,
      samplePrompt: challenge.samplePrompt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json({ error: message }, { status: 500 })
  }
}
