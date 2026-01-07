# SpotiClick

Metronom für Spotify, das beim Starten eines Songs automatisch losklickt, beim Pausieren stoppt und seine BPM primär aus Spotify Audio Features bezieht. Wenn Spotify nicht antwortet, greift SpotiClick auf [GetSongBPM.com](https://getsongbpm.com) zurück. Das Backend fungiert als einfacher Proxy und die Oberfläche läuft komplett im Browser. **Wichtig:** Die Nutzung der GetSongBPM-API ist nur erlaubt, wenn du einen Link zurück zu [GetSongBPM.com](https://getsongbpm.com) platzierst (siehe Hinweis unten).

## Voraussetzungen

- Node.js 20+ (keine externen NPM-Abhängigkeiten nötig)
- Ein Spotify OAuth Token mit mindestens den Scopes `user-read-playback-state`, `streaming` und `user-modify-playback-state`
- Ein gültiger GetSongBPM API-Key (z. B. über RapidAPI oder einen direkten Zugang). Dieser bleibt auf dem Server und wird **nicht** im Browser gespeichert.

## Installation & Start

1. Optional: Kopiere `.env.example` nach `.env` und trage deinen GetSongBPM-Zugang ein. Beispiel:
   ```
   SONGBPM_BASE_URL=https://api.getsongbpm.com
   SONGBPM_PATH_TEMPLATE=/tempo/
   SONGBPM_API_KEY=dein-geheimer-key
   SONGBPM_API_KEY_PARAM=api_key
   SONGBPM_ID_PARAM=id
   SONGBPM_TITLE_PARAM=song
   SONGBPM_ARTIST_PARAM=artist
   PORT=3000
   ```
2. Starte den lokalen Server:
   ```bash
   npm start
   ```
   Der Server liest das Spotify-Web-UI aus `public/` und stellt unter `/api/songbpm/spotify/:id` einen Proxy zu GetSongBPM bereit. Externe Pakete werden nicht benötigt.
3. Öffne `http://localhost:3000` im Browser (HTTPS wird für den Spotify Web Playback SDK empfohlen, `localhost` ist als Ausnahme erlaubt).

## Nutzung

1. Besorge dir ein Spotify OAuth Token (z. B. über die [Spotify Web Console](https://developer.spotify.com/console)).
2. Trage das Token im Feld „Spotify OAuth Token“ ein und klicke auf **Verbinden**.
3. Sobald ein Song auf deinem Spotify-Account gestartet oder fortgesetzt wird, holt SpotiClick die BPM:
   - Primär über Spotify Audio Features (`/v1/audio-features/{id}`).
   - Fallback: GetSongBPM via `/api/songbpm/spotify/<trackId>` (konfigurierbar über `.env`), falls Spotify nicht antwortet.
4. Das Metronom startet automatisch, wenn der Song läuft, und stoppt beim Pausieren.

## Anpassen des GetSongBPM-Aufrufs

- Passe `SONGBPM_BASE_URL`, `SONGBPM_PATH_TEMPLATE`, `SONGBPM_API_KEY_PARAM`, `SONGBPM_AUTH_HEADER`, `SONGBPM_ID_PARAM`, `SONGBPM_TITLE_PARAM` und `SONGBPM_ARTIST_PARAM` in der `.env` an den von dir genutzten GetSongBPM-Endpunkt an (einige Anbieter nutzen RapidAPI, andere ein eigenes Header-Feld für den API-Key).
- Der Pfad unterstützt `{id}` als Platzhalter für die Spotify Track ID. Standardmäßig wird `/tempo/` mit Query-Parametern (`id`, `song`, `artist`) genutzt.

## GetSongBPM Link-Pflicht

> „Using our API is free but a link back to GetSongBPM.com is REQUIRED (website or store listing), or we will suspend your account without notice.“

Stelle sicher, dass du den Link zur Startseite von GetSongBPM auf deiner Seite oder im Store-Eintrag platzierst. In der mitgelieferten UI wird bereits auf GetSongBPM verwiesen.

## Projektstruktur

```
├── public/            # Statisches Frontend (ES-Module, kein Build-Step nötig)
│   ├── index.html
│   ├── app.js         # UI-Logik & Orchestrierung
│   ├── metronome.js   # Web-Audio-Metronom
│   ├── songbpm.js     # BPM-Fetcher + Spotify-Fallback
│   ├── spotify.js     # Web Playback SDK Integration
│   └── styles.css
├── server.js          # Statischer Server + GetSongBPM-Proxy
├── .env.example
└── README.md
```

## Hinweise & Grenzen

- Da die GetSongBPM-API nicht öffentlich dokumentiert ist, ist der Proxy flexibel konfigurierbar. Falls du andere Header oder Pfade brauchst, passe die `.env` an.
- Damit das Web Playback SDK funktioniert, muss der Browser Zugriff auf dein Spotify-Konto haben; ein Premium-Account ist erforderlich.
- Lokale Audio-Ausgabe: Das Metronom nutzt die Web Audio API. In einigen Browsern muss die Seite vorab eine Interaktion erhalten, damit Audio ohne weitere Gesten starten darf.
