# Feature: Prompt-Navigator („Der CFO wartet")

Neues Spielformat `prompt_branching`: Entscheidungsbaum, in dem der User zwischen
vorgegebenen Prompts wählt, KI-Outputs kritisch bewertet (inkl. kontrollierter
Halluzination), Probleme diagnostiziert und Korrekturstrategien wählt.
Lernziele: CRAFT-Prompting, Output-Verifikation, gezieltes Nachsteuern.

## Enthaltene Dateien (alle NEU — keine bestehende Datei wird verändert)

| Datei | Zweck |
|---|---|
| `src/types/branching.ts` | Typen für das Format (bewusst getrennt von `game.ts`) |
| `src/components/BranchingGamePlayer.tsx` | Player-Komponente (Stil analog `ChatGamePlayer`) |
| `content/games/prompt_branching_cfo_abweichungsanalyse.json` | Komplettes Beispielspiel (13 Knoten, 10 Punkte) |

## Integration (1 Datei, ~8 Zeilen — als eigener, klar attribuierter Commit)

Die einzige Berührung mit Bestandscode ist der Format-Dispatch in
`src/components/GamePreviewModal.tsx`. Direkt nach dem bestehenden
`chat_challenge`-Block einfügen:

```tsx
import BranchingGamePlayer from './BranchingGamePlayer'

// ... innerhalb von GamePreviewModal, nach dem chat_challenge-if:
if (game.game_json.format === 'prompt_branching') {
  return (
    /* gleiche Overlay/Card-Struktur wie beim chat_challenge-Block,
       nur mit <BranchingGamePlayer game={game} onComplete={...} /> */
  )
}
```

Tipp: Den Overlay-Wrapper aus dem `chat_challenge`-Block 1:1 kopieren und nur
den Player austauschen — Untertitel z. B. `Prompt-Navigator · {game.difficulty}`.

## Beispielspiel in Supabase laden

```
POST https://DEIN_PROJEKT.supabase.co/rest/v1/games
Headers:
  apikey: <service_role_key>
  Authorization: Bearer <service_role_key>
  Content-Type: application/json
Body: Inhalt von content/games/prompt_branching_cfo_abweichungsanalyse.json
      (Feld "id" ggf. weglassen, falls die Tabelle UUIDs generiert)
```

## Hinweise für die n8n-Pipeline

- `aiContextNote` im game_json beschreibt, wie der Content Generator Agent die
  `aiOutput`-Felder erzeugen soll (promptText real gegen kiconnect ausführen).
- `injectedError` dokumentiert die absichtliche Halluzination maschinenlesbar,
  damit der Compliance Agent sie verifiziert statt sie zu „korrigieren".
- Scoring-Integration wie gehabt: `onComplete(score)` → POST auf `/rest/v1/scores`.

## Design-Entscheidungen

- Beide Pfade sind spielbar wertvoll: Pfad A (vager Prompt) max. 8 Punkte,
  Pfad B (CRAFT-Prompt) max. 10 Punkte — Rettung wird belohnt, Erstwahl leicht bevorzugt.
- `passingScore: 6` — wer in Pfad B „stillschweigend korrigieren" oder „neu anfangen"
  wählt, landet bei genau 6. Auf 7 erhöhen, falls diese Pfade durchfallen sollen.
- Feedback-Texte verraten nie die Antwort der jeweils nächsten Frage.
