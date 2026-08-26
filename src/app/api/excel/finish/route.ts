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
        { temperature: 0.6 },
        { source: 'excel.finish', actorId: playerId, gameId, meta: { score, attemptsUsed } }
      )
      feedback = feedback.trim()
      if (!feedback) throw new Error('leere Antwort')
    } catch {
      feedback = buildFallbackFeedback(score, criteriaResults)
    }

    if (playerId !== null) {
      // Service role: RLS sits on `scores`, so the anon client was silently
      // writing nothing here — Excel plays were missing from the leaderboard as a result.
      const { error: scoreError } = await supabaseAdmin
        .from('scores')
        // Leaderboard score consistently as a percentage (0-100), like the other game types.
        // The attempt-weighted pointsEarned is only for display (response below).
        .insert([{ player_id: playerId, game_id: gameId, score: Math.round(score) }])
      if (scoreError) console.error('[excel/finish] Score-Insert fehlgeschlagen:', scoreError)
      // Points source per spec: the game's maxPoints on passing (all criteria
      // met), otherwise 0 — deliberately NOT the attempt-weighted `pointsEarned`,
      // which only feeds the `scores` history.
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
