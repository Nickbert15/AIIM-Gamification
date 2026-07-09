# PR: Hallucination Spotter v2 + Prompt Arena

## Beschreibung

Zwei neue, interaktive Spieltypen: Hallucination Spotter v2 (Prompt-Auswahl +
Markieren erfundener Sätze in einem fließenden Text) und Prompt Arena (eigener
Prompt + Drag-and-Drop-Ranking gegen Referenzantworten).

Beide Spiele wurden für eine Zielgruppe ohne KI-Vorerfahrung überarbeitet:
neue geteilte Gamification-Bausteine (`src/components/ui`) — fokussierbare
Popups, selbstgebautes Canvas-Konfetti, animierter Punktezähler, Sterne,
Badges, ein 6-stufiger Konfidenz-Slider und ein Onboarding-Overlay pro Spiel.
Hallucination Spotter v2 zeigt jetzt 5 Prompts mit unterschiedlichem
Prompting-Ansatz und einen vollständigen ~500-Wörter-Antworttext mit
eingebauten Halluzinationen statt kurzer Einzelzeilen, inklusive
Kalibrierungs-Feedback (Konfidenz vs. tatsächliche Trefferquote). Prompt Arena
zeigt nach der Bewertung ein einziges Auswertungs-Popup mit animiertem
Prozentwert, Ranking-Auflösung und persönlichem KI-Coaching zum eigenen
Prompt, mit einem freundlichen Fallback, falls die KI-Bewertung fehlschlägt.

**Hinweis:** Der n8n-Workflow für `format: 'prompt_arena'` ist noch nicht
implementiert — `/api/generate` sendet zwar den Trigger, aber es fehlt die
n8n-seitige Logik, die daraus ein passendes `game_json` erzeugt und in
Supabase schreibt. Dieses muss exakt die Form
`{ arenaRounds: [{ id, taskDescription, systemContext, referenceOutputs: [{id, text, qualityRank: 1, note}, {id, text, qualityRank: 2, note}] }] }`
haben — insbesondere genau eine Referenzantwort mit `qualityRank: 1` und
genau eine mit `qualityRank: 2`, da die Auswertungslogik sonst
stillschweigend fehlschlägt.
