// Shadows of Pasar Senja v2 — synthesized WebAudio sounds, no audio files.
export function makeAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, when = 0, low = 400) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = low;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    step() { tone(180 + Math.random() * 60, 0.05, 'sine', 0.10); },
    coin() { tone(1900, 0.09, 'triangle', 0.16); tone(2500, 0.12, 'triangle', 0.12, 0.07); },
    clink() { tone(3200, 0.05, 'square', 0.06); tone(2400, 0.07, 'square', 0.05, 0.05); },
    pickup() { tone(660, 0.10, 'triangle', 0.18); tone(880, 0.10, 'triangle', 0.18, 0.08); tone(1320, 0.16, 'triangle', 0.16, 0.16); },
    suspicious() { tone(520, 0.16, 'sawtooth', 0.07, 0, 700); },
    alarm() { tone(440, 0.22, 'sawtooth', 0.14, 0, 880); tone(440, 0.22, 'sawtooth', 0.14, 0.24, 880); },
    smoke() { noiseBurst(0.35, 0.20, 0, 900); },
    bark() { tone(300, 0.08, 'square', 0.12, 0, 180); tone(300, 0.08, 'square', 0.12, 0.12, 180); },
    caught() { tone(220, 0.4, 'sawtooth', 0.18, 0, 90); noiseBurst(0.25, 0.16, 0.05, 300); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.11)); },
    click() { tone(900, 0.05, 'sine', 0.10); },
  };
}
