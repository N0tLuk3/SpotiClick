import { Metronome } from './metronome.js';
import { SongBpmClient } from './songbpm.js';
import { SpotifyController } from './spotify.js';

const elements = {
  spotifyToken: document.getElementById('spotifyToken'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  trackInfo: document.getElementById('trackInfo'),
  bpmValue: document.getElementById('bpmValue'),
  metronomeState: document.getElementById('metronomeState'),
  log: document.getElementById('log'),
  logTemplate: document.getElementById('logLineTemplate'),
  songBpmBaseUrl: document.getElementById('songBpmBaseUrl'),
  songBpmKeyInfo: document.getElementById('songBpmKeyInfo')
};

const metronome = new Metronome();
const bpmClient = new SongBpmClient({ logger: console });
const bpmCache = new Map();
let spotifyController = null;
let currentTrackId = null;

function log(message) {
  const clone = elements.logTemplate.content.cloneNode(true);
  const line = clone.querySelector('.log-line');
  line.querySelector('.time').textContent = new Date().toLocaleTimeString();
  line.querySelector('.message').textContent = message;
  elements.log.prepend(clone);
  while (elements.log.childElementCount > 80) {
    elements.log.lastElementChild.remove();
  }
}

function setStatus(text) {
  elements.connectionStatus.textContent = text;
}

function updateTrackInfo(track) {
  if (!track) {
    elements.trackInfo.textContent = 'Kein Track';
    return;
  }
  const artists = track.artists?.map(a => a.name).join(', ');
  elements.trackInfo.textContent = `${track.name} – ${artists}`;
}

function updateMetronomeState(running) {
  elements.metronomeState.textContent = running ? 'läuft' : 'gestoppt';
}

function setBpmValue(bpm, source = '') {
  elements.bpmValue.textContent = bpm ? `${Math.round(bpm)}${source ? ` (${source})` : ''}` : '–';
}

async function ensureMetronomeForTrack(track, paused) {
  if (!track) return;
  if (paused) {
    metronome.stop();
    updateMetronomeState(false);
    log('Song pausiert → Metronom gestoppt');
    return;
  }

  const cacheKey = track.id;
  let info = bpmCache.get(cacheKey);
  if (!info) {
    setBpmValue('…');
    try {
      info = await bpmClient.fetchBpm({
        trackId: track.id,
        trackName: track.name,
        artistNames: track.artists?.map(a => a.name),
        spotifyToken: spotifyController?.token
      });
      bpmCache.set(cacheKey, info);
      log(`BPM geladen (${info.source}): ${info.bpm}`);
    } catch (error) {
      log(`BPM konnte nicht geladen werden: ${error.message}`);
      return;
    }
  }

  metronome.setBpm(info.bpm);
  metronome.start();
  updateMetronomeState(true);
  const sourceLabel = info.source === 'spotify' ? 'Spotify' : 'GetSongBPM';
  const finalLabel = info.source === 'getsongbpm-fallback' ? `${sourceLabel} Fallback` : sourceLabel;
  setBpmValue(info.bpm, finalLabel);
}

async function handleStateChange(state) {
  const track = state?.track_window?.current_track;
  updateTrackInfo(track);
  if (!track) return;

  if (currentTrackId !== track.id) {
    currentTrackId = track.id;
    log(`Neuer Track: ${track.name}`);
    metronome.stop();
  }

  await ensureMetronomeForTrack(track, state.paused);
}

async function connect() {
  const token = elements.spotifyToken.value.trim();
  if (!token) {
    alert('Bitte ein gültiges Spotify OAuth Token eintragen.');
    return;
  }

  elements.connectBtn.disabled = true;
  try {
    spotifyController = new SpotifyController({ token, onStateChange: handleStateChange, logger: console });
    await spotifyController.connect();
    setStatus('Verbunden');
    elements.disconnectBtn.disabled = false;
    log('Mit Spotify verbunden. Warte auf Wiedergabe…');

    const playback = await spotifyController.fetchCurrentPlayback();
    if (playback?.item) {
      updateTrackInfo(playback.item);
      currentTrackId = playback.item.id;
      await ensureMetronomeForTrack(playback.item, playback.is_playing === false);
    }
  } catch (error) {
    console.error(error);
    alert(`Fehler beim Verbinden: ${error.message}`);
    setStatus('Nicht verbunden');
  } finally {
    elements.connectBtn.disabled = false;
  }
}

async function disconnect() {
  elements.disconnectBtn.disabled = true;
  await spotifyController?.disconnect();
  spotifyController = null;
  metronome.stop();
  bpmCache.clear();
  setStatus('Nicht verbunden');
  updateTrackInfo(null);
  setBpmValue(null);
  updateMetronomeState(false);
  log('Verbindung getrennt.');
}

function hydrateBackendInfo() {
  const baseUrl = window.location.origin;
  elements.songBpmBaseUrl.value = `${baseUrl}/api/songbpm/spotify/{id}`;
  elements.songBpmKeyInfo.value = 'Setze SONGBPM_API_KEY im Backend (.env)';
}

hydrateBackendInfo();
elements.connectBtn.addEventListener('click', connect);
elements.disconnectBtn.addEventListener('click', disconnect);
