const LOOKAHEAD = 0.1; // seconds
const SCHEDULE_AHEAD_TIME = 0.25;

export class Metronome {
  constructor() {
    this.audioContext = null;
    this.isRunning = false;
    this.nextNoteTime = 0;
    this.bpm = 120;
    this._timer = null;
  }

  setBpm(bpm) {
    const numeric = Number(bpm);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    this.bpm = numeric;
  }

  start() {
    if (this.isRunning) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    this.isRunning = true;
    this.nextNoteTime = this.audioContext.currentTime + LOOKAHEAD;
    this._scheduler();
  }

  stop() {
    this.isRunning = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _scheduler() {
    if (!this.isRunning || !this.audioContext) return;
    while (this.nextNoteTime < this.audioContext.currentTime + SCHEDULE_AHEAD_TIME) {
      this._playClick(this.nextNoteTime);
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextNoteTime += secondsPerBeat;
    }
    this._timer = setTimeout(() => this._scheduler(), LOOKAHEAD * 1000);
  }

  _playClick(time) {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.frequency.value = 1000;
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(0.4, time + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  }
}
