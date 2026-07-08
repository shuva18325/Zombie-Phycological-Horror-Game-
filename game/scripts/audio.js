/* ============================================================
   audio.js — sound engine
   - Loads the WAV assets (knock, alert, helicopter, tv static,
     ambience) as HTMLAudio elements so it works from file://.
   - Synthesises extra horror cues (gunshots, screams, sirens,
     heartbeat, whispers, power-down) with the Web Audio API so no
     external files are needed for them.
   Exposes: window.ZH.Audio
   ============================================================ */
(function (ZH) {
  "use strict";

  const FILES = {
    knock: "assets/audio/knock.wav",
    alert: "assets/audio/alert.wav",
    helicopter: "assets/audio/helicopter.wav",
    tvStatic: "assets/audio/tv_static.wav",
    ambience: "assets/audio/ambience.wav",
  };

  const Audio_ = {
    ctx: null,
    master: null,
    muted: false,
    started: false,
    elems: {},       // name -> HTMLAudioElement (fresh clones for overlap)
    tvStaticEl: null,
    ambienceEl: null,
    droneNodes: null,
    tension: 0,

    /** Preload the WAV assets. Safe to call before any user gesture. */
    preload() {
      for (const k in FILES) {
        try {
          const a = new window.Audio(FILES[k]);
          a.preload = "auto";
          this.elems[k] = a;
        } catch (e) { /* ignore — synth still works */ }
      }
    },

    /** Must be called from a user gesture (button click). */
    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this._startDrone();
      } catch (e) {
        this.ctx = null; // graceful: file sounds still play
      }
      this.started = true;
    },

    resume() {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.9;
      if (this.ambienceEl) this.ambienceEl.volume = m ? 0 : 0.5;
      if (this.tvStaticEl) this.tvStaticEl.volume = m ? 0 : 0.4;
    },

    toggleMute() { this.setMuted(!this.muted); return this.muted; },

    /* ---------- file-based one-shots ---------- */
    _play(name, vol) {
      if (this.muted) return null;
      const base = this.elems[name];
      if (!base) return null;
      try {
        const el = base.cloneNode();
        el.volume = vol == null ? 0.8 : vol;
        el.play().catch(() => {});
        return el;
      } catch (e) { return null; }
    },

    knock() { this._play("knock", 0.9); },
    alert() { this._play("alert", 0.7); },
    helicopterPass() { this._play("helicopter", 0.6); },

    startTvStatic() {
      if (this.tvStaticEl) return;
      const base = this.elems.tvStatic;
      if (!base) return;
      try {
        const el = base.cloneNode();
        el.loop = true;
        el.volume = this.muted ? 0 : 0.35;
        el.play().catch(() => {});
        this.tvStaticEl = el;
      } catch (e) {}
    },
    stopTvStatic() {
      if (this.tvStaticEl) { try { this.tvStaticEl.pause(); } catch (e) {} this.tvStaticEl = null; }
    },

    startAmbience() {
      if (this.ambienceEl) return;
      const base = this.elems.ambience;
      if (!base) return;
      try {
        const el = base.cloneNode();
        el.loop = true;
        el.volume = this.muted ? 0 : 0.5;
        el.play().catch(() => {});
        this.ambienceEl = el;
      } catch (e) {}
    },
    stopAmbience() {
      if (this.ambienceEl) { try { this.ambienceEl.pause(); } catch (e) {} this.ambienceEl = null; }
    },

    /* ---------- Web Audio synthesis helpers ---------- */
    _noiseBuffer(dur) {
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },

    _env(node, peak, dur, attack) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const a = attack == null ? 0.005 : attack;
      node.gain.setValueAtTime(0.0001, t);
      node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
      node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    },

    /** Sustained low drone whose intensity tracks tension (0..1). */
    _startDrone() {
      if (!this.ctx) return;
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      o1.type = "sine"; o2.type = "sine";
      o1.frequency.value = 48; o2.frequency.value = 48.6; // slow beat
      const g = this.ctx.createGain();
      g.gain.value = 0.0;
      o1.connect(g); o2.connect(g); g.connect(this.master);
      o1.start(); o2.start();
      this.droneNodes = { o1, o2, g };
    },
    setTension(level) {
      this.tension = Math.max(0, Math.min(1, level));
      if (this.droneNodes && this.ctx) {
        this.droneNodes.g.gain.linearRampToValueAtTime(
          0.02 + this.tension * 0.13, this.ctx.currentTime + 0.6);
        this.droneNodes.o1.frequency.linearRampToValueAtTime(
          46 + this.tension * 6, this.ctx.currentTime + 0.6);
      }
    },

    gunshot() {
      if (!this.ctx || this.muted) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(0.3);
      const bp = this.ctx.createBiquadFilter();
      bp.type = "lowpass"; bp.frequency.value = 1200;
      const g = this.ctx.createGain();
      src.connect(bp); bp.connect(g); g.connect(this.master);
      this._env(g, 0.9, 0.28, 0.001);
      src.start();
      src.stop(this.ctx.currentTime + 0.3);
    },

    distantGunfire() {
      // a small burst of muffled shots
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!this.ctx || this.muted) return;
          const src = this.ctx.createBufferSource();
          src.buffer = this._noiseBuffer(0.2);
          const lp = this.ctx.createBiquadFilter();
          lp.type = "lowpass"; lp.frequency.value = 500;
          const g = this.ctx.createGain();
          src.connect(lp); lp.connect(g); g.connect(this.master);
          this._env(g, 0.35, 0.18, 0.001);
          src.start(); src.stop(this.ctx.currentTime + 0.2);
        }, i * (90 + Math.random() * 120));
      }
    },

    rain(on) {
      if (!this.ctx) return;
      if (on) {
        if (this._rainNode) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer(2.0);
        src.loop = true;
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 900;
        const g = this.ctx.createGain();
        g.gain.value = 0.0;
        src.connect(lp); lp.connect(g); g.connect(this.master);
        src.start();
        g.gain.linearRampToValueAtTime(this.muted ? 0 : 0.14, this.ctx.currentTime + 2);
        this._rainNode = { src, g };
      } else if (this._rainNode) {
        const r = this._rainNode; this._rainNode = null;
        r.g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);
        setTimeout(() => { try { r.src.stop(); } catch (e) {} }, 1700);
      }
    },

    explosion() {
      // a strike-wave detonation: deep boom + falling rumble
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(1.4);
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(420, t);
      lp.frequency.exponentialRampToValueAtTime(60, t + 1.2);
      const g = this.ctx.createGain();
      src.connect(lp); lp.connect(g); g.connect(this.master);
      this._env(g, 0.85, 1.3, 0.005);
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.0);
      const g2 = this.ctx.createGain();
      o.connect(g2); g2.connect(this.master);
      this._env(g2, 0.5, 1.1, 0.01);
      src.start(); src.stop(t + 1.4);
      o.start(); o.stop(t + 1.2);
    },

    scream() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.9);
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = "bandpass"; lp.frequency.value = 900; lp.Q.value = 4;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      this._env(g, 0.28, 1.0, 0.02);
      o.start(); o.stop(t + 1.05);
    },

    siren(on) {
      if (!this.ctx) return;
      if (on) {
        if (this._siren) return;
        const o = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        o.type = "sawtooth"; o.frequency.value = 620;
        lfo.type = "sine"; lfo.frequency.value = 0.3; lfoGain.gain.value = 180;
        lfo.connect(lfoGain); lfoGain.connect(o.frequency);
        const g = this.ctx.createGain(); g.gain.value = 0.0;
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
        o.connect(lp); lp.connect(g); g.connect(this.master);
        o.start(); lfo.start();
        g.gain.linearRampToValueAtTime(this.muted ? 0 : 0.06, this.ctx.currentTime + 1.5);
        this._siren = { o, lfo, g };
      } else if (this._siren) {
        const s = this._siren; this._siren = null;
        s.g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
        setTimeout(() => { try { s.o.stop(); s.lfo.stop(); } catch (e) {} }, 1400);
      }
    },

    heartbeat() {
      if (!this.ctx || this.muted) return;
      const thump = (delay, peak) => {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        const t = this.ctx.currentTime + delay;
        o.frequency.setValueAtTime(80, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.master);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.start(t); o.stop(t + 0.24);
      };
      thump(0, 0.5); thump(0.22, 0.34);
    },

    whisper() {
      if (!this.ctx || this.muted) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(1.4);
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 6;
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      lfo.frequency.value = 5.5; lfoG.gain.value = 700;
      lfo.connect(lfoG); lfoG.connect(bp.frequency);
      const g = this.ctx.createGain();
      src.connect(bp); bp.connect(g); g.connect(this.master);
      this._env(g, 0.14, 1.4, 0.2);
      lfo.start(); src.start(); src.stop(this.ctx.currentTime + 1.4);
      lfo.stop(this.ctx.currentTime + 1.4);
    },

    houseNoise() {
      // a creak / thud somewhere in the house
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "triangle";
      const t = this.ctx.currentTime;
      const base = 60 + Math.random() * 60;
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 0.6, t + 0.4);
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      this._env(g, 0.3, 0.5, 0.01);
      o.start(); o.stop(t + 0.55);
    },

    powerDown() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.7);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.master);
      this._env(g, 0.25, 0.75, 0.01);
      o.start(); o.stop(t + 0.8);
    },

    powerUp() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(40, t);
      o.frequency.exponentialRampToValueAtTime(210, t + 0.35);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.master);
      this._env(g, 0.15, 0.4, 0.01);
      o.start(); o.stop(t + 0.45);
    },

    coffee() {
      // little water/steam bubble
      if (!this.ctx || this.muted) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(0.6);
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 3;
      const g = this.ctx.createGain();
      src.connect(bp); bp.connect(g); g.connect(this.master);
      this._env(g, 0.08, 0.6, 0.05);
      src.start(); src.stop(this.ctx.currentTime + 0.6);
    },

    blip() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "square"; o.frequency.value = 660;
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.master);
      this._env(g, 0.08, 0.09, 0.002);
      o.start(); o.stop(this.ctx.currentTime + 0.1);
    },

    thud() {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      o.type = "sine";
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.master);
      this._env(g, 0.5, 0.25, 0.001);
      o.start(); o.stop(t + 0.28);
    },
  };

  ZH.Audio = Audio_;
})(window.ZH = window.ZH || {});
