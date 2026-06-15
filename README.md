# LHG AI Enablement Platform — Web Frontend

Leaderboard & Admin-Oberfläche für den PoC.

## Setup

### 1. Dependencies installieren
```bash
npm install
```

### 2. Supabase-Credentials eintragen
```bash
cp .env.local.example .env.local
# Dann .env.local bearbeiten und deine Werte eintragen
```

Werte findest du im Supabase Dashboard unter: **Settings → API**

### 3. Lokal starten
```bash
npm run dev
# → http://localhost:3000
```

### 4. Auf Vercel deployen
```bash
npx vercel --prod
# Env-Variablen im Vercel Dashboard eintragen (Settings → Environment Variables)
```

## Seiten

| Route | Beschreibung |
|-------|-------------|
| `/` | Öffentliches Leaderboard (Realtime) |
| `/admin` | Admin-Übersicht mit Stats |
| `/admin/players` | Spieler anlegen / verwalten |
| `/admin/scores` | Scores manuell eintragen |
| `/admin/games` | Gespielte Games & Engagement-Stats |

## n8n-Integration

Scores aus der Pipeline via Supabase REST API schreiben:

```
POST https://DEIN_PROJEKT.supabase.co/rest/v1/scores
Headers:
  apikey: <service_role_key>
  Authorization: Bearer <service_role_key>
  Content-Type: application/json
Body:
  { "player_id": "uuid", "game_id": "quiz_001", "score": 850 }
```

Im n8n HTTP Request Node eintragen.
