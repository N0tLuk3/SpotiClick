function waitForSpotifySdk() {
  if (window.Spotify) return Promise.resolve(window.Spotify);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Spotify SDK lädt nicht.')), 8000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve(window.Spotify);
    };
  });
}

export class SpotifyController {
  constructor({ token, onStateChange, logger = console } = {}) {
    this.token = token;
    this.onStateChange = onStateChange;
    this.logger = logger;
    this.player = null;
  }

  setToken(token) {
    this.token = token;
  }

  async connect() {
    if (!this.token) throw new Error('Spotify Token fehlt');
    const Spotify = await waitForSpotifySdk();
    this.player = new Spotify.Player({
      name: 'SpotiClick Metronom',
      getOAuthToken: cb => cb(this.token),
      volume: 0.5
    });

    this.player.addListener('ready', ({ device_id }) => {
      this.logger.log('[Spotify] Player bereit:', device_id);
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      this.logger.warn('[Spotify] Player offline:', device_id);
    });

    this.player.addListener('player_state_changed', state => {
      if (state && typeof this.onStateChange === 'function') {
        this.onStateChange(state);
      }
    });

    await this.player.connect();
  }

  async disconnect() {
    if (this.player) {
      await this.player.disconnect();
      this.player = null;
    }
  }

  async fetchCurrentPlayback() {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!response.ok) return null;
    return response.json();
  }
}
