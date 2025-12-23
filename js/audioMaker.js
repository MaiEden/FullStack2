"use strict";

class audioMaker {
  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = Ctx ? new Ctx() : null;

    this.baseFreqs = [270, 330, 390, 470, 560, 650];
  }

  _tone(freq, dur = 0.22, type = "sine", gainPeak = 0.18) {
    if (!this.ctx) return;

    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      o.type = type;
      o.frequency.value = freq;

      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.ctx.destination);

      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {}
  }

  beep(padIndex) {
    const freq = this.baseFreqs[padIndex % this.baseFreqs.length];
    this._tone(freq, 0.22, "sine", 0.18);
  }

  error() {
    this._tone(120, 0.18, "square", 0.22);
  }

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