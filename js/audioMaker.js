"use strict";
/**
 * audioMaker
 * A helper class for generating simple sound effects
 * using the Web Audio API.
 */
class audioMaker {
  constructor() {
    // Use AudioContext implementation
    const Ctx = window.AudioContext;

    // Create a new audio context if supported, otherwise null
    this.ctx = Ctx ? new Ctx() : null;

    // Base frequencies used for pad beeps
    this.baseFreqs = [270, 330, 390, 470, 560, 650];
  }

  /**
   * Internal method to play a single tone
   * freq - Frequency in Hz
   * dur - Duration in seconds
   * type - Oscillator waveform type
   * gainPeak - Maximum volume level
   */
  _tone(freq, dur = 0.22, type = "sine", gainPeak = 0.18) {
    // If audio context is not available, do nothing
    if (!this.ctx) return;

    try {
      // Create oscillator (sound source)
      const o = this.ctx.createOscillator();

      // Create gain node (volume control)
      const g = this.ctx.createGain();

      // Configure oscillator
      o.type = type;
      o.frequency.value = freq;

      // Start with almost silent volume
      g.gain.value = 0.0001;

      // Connect oscillator -> gain -> speakers
      o.connect(g);
      g.connect(this.ctx.destination);

      // Current audio context time
      const t = this.ctx.currentTime;

      // Smooth volume fade in and fade out
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      // Start and stop the sound
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {
      // Silently ignore any audio errors
    }
  }

  // Play a short beep based on pad index
  beep(padIndex) {
    const freq = this.baseFreqs[padIndex % this.baseFreqs.length];
    this._tone(freq, 0.22, "sine", 0.18);
  }

  //Play an error sound
  error() {
    this._tone(120, 0.18, "square", 0.22);
  }

  //Play a short "win" melody
  win() {
    if (!this.ctx) return;

    const seq = [520, 660, 780];
    let t = 0;

    seq.forEach((f) => {
      setTimeout(() => this._tone(f, 0.18, "sine", 0.20), t);
      t += 140;
    });
  }
}
