const SONG_BPM_ENDPOINT = '/api/songbpm/spotify';

function extractBpmFromResponse(data) {
  if (!data) return null;
  if (typeof data === 'number') return data;
  if (data.tempo) return data.tempo;
  if (data.bpm) return data.bpm;
  if (data.track && (data.track.tempo || data.track.bpm)) return data.track.tempo || data.track.bpm;
  if (Array.isArray(data.songs) && data.songs.length) {
    const candidate = data.songs[0];
    return candidate.tempo || candidate.bpm || candidate?.song?.tempo || candidate?.song?.bpm;
  }
  if (data.audio_features && data.audio_features.tempo) return data.audio_features.tempo;
  return null;
}

export class SongBpmClient {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  async fetchBpm({ trackId, trackName, artistNames, spotifyToken }) {
    const search = new URLSearchParams();
    if (trackName) search.set('title', trackName);
    if (artistNames?.length) search.set('artist', artistNames.join(', '));

    try {
      const response = await fetch(`${SONG_BPM_ENDPOINT}/${encodeURIComponent(trackId)}?${search.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`GetSongBPM-Proxy Fehler: ${response.status} ${text}`);
      }
      const data = await response.json();
      const bpm = extractBpmFromResponse(data);
      if (!bpm) throw new Error('GetSongBPM Antwort enthielt keine BPM');
      return { bpm, source: 'getsongbpm', raw: data };
    } catch (error) {
      this.logger.error('[GetSongBPM]', error.message);
      if (!spotifyToken) throw error;
      const spotifyBpm = await this.fetchFromSpotifyAudioFeatures(trackId, spotifyToken);
      return { bpm: spotifyBpm, source: 'spotify-fallback' };
    }
  }

  async fetchFromSpotifyAudioFeatures(trackId, token) {
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(trackId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify Audio-Features fehlgeschlagen: ${response.status} ${text}`);
    }
    const data = await response.json();
    const bpm = data.tempo;
    if (!bpm) throw new Error('Spotify lieferte keine BPM');
    return bpm;
  }
}
