/**
 * SoundManager.js - Procedural Web Audio Synthesizer
 * Zero external audio files required; instant loading, 100% interactive.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.isInitialized = false;

    // Engine sound nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    // Skid noise
    this.skidGain = null;
    this.skidSource = null;

    // Horn nodes
    this.hornOsc1 = null;
    this.hornOsc2 = null;
    this.hornGain = null;
    this.isHornPlaying = false;

    this.setupUnlockListeners();
  }

  setupUnlockListeners() {
    const unlock = () => {
      if (!this.isInitialized) {
        this.init();
      } else if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    };

    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { once: false });
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Master volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initEngine();
      this.initSkid();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  initEngine() {
    if (!this.ctx) return;

    // Dual oscillator for rich, warm RC engine hum
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  initSkid() {
    if (!this.ctx) return;

    // Buffer noise for tire skid
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    skidFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(skidFilter);
    skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    whiteNoise.start();
    this.skidSource = whiteNoise;
  }

  updateEngine(speedRatio, isAccelerating, isBraking) {
    if (!this.isInitialized || !this.enabled || !this.ctx) return;

    const targetFreq = 40 + Math.abs(speedRatio) * 160 + (isAccelerating ? 25 : 0);
    const targetGain = 0.04 + Math.abs(speedRatio) * 0.12 + (isAccelerating ? 0.06 : 0);
    const targetFilter = 220 + Math.abs(speedRatio) * 600 + (isAccelerating ? 200 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.02, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.06);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  setSkid(intensity) {
    if (!this.isInitialized || !this.enabled || !this.ctx || !this.skidGain) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    this.skidGain.gain.setTargetAtTime(clamped * 0.25, this.ctx.currentTime, 0.05);
  }

  startHorn() {
    if (!this.isInitialized || !this.enabled || !this.ctx || this.isHornPlaying) return;
    this.isHornPlaying = true;

    const now = this.ctx.currentTime;
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc2 = this.ctx.createOscillator();

    // Classic cheerful two-tone horn: F5 (698Hz) and A5 (880Hz)
    this.hornOsc1.type = 'triangle';
    this.hornOsc2.type = 'triangle';
    this.hornOsc1.frequency.setValueAtTime(698, now);
    this.hornOsc2.frequency.setValueAtTime(880, now);

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0.001, now);
    this.hornGain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);

    this.hornOsc1.connect(this.hornGain);
    this.hornOsc2.connect(this.hornGain);
    this.hornGain.connect(this.masterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  stopHorn() {
    if (!this.isHornPlaying || !this.ctx) return;
    this.isHornPlaying = false;
    const now = this.ctx.currentTime;
    if (this.hornGain) {
      this.hornGain.gain.setTargetAtTime(0.0001, now, 0.03);
      setTimeout(() => {
        try {
          if (this.hornOsc1) this.hornOsc1.stop();
          if (this.hornOsc2) this.hornOsc2.stop();
        } catch (_) {}
      }, 50);
    }
  }

  playCollision(impactVelocity = 5) {
    if (!this.isInitialized || !this.enabled || !this.ctx) return;
    if (impactVelocity < 1.2) return;

    const now = this.ctx.currentTime;
    const intensity = Math.min(1, impactVelocity / 15);

    // Punch oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + intensity * 60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(intensity * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);

    // Click/crunch noise
    const bufferSize = this.ctx.sampleRate * 0.08;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(intensity * 0.2, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
  }

  playBoost() {
    if (!this.isInitialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  playStrike() {
    if (!this.isInitialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 fanfare

    notes.forEach((freq, idx) => {
      const time = now + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.45);
    });
  }

  playUiClick() {
    if (!this.isInitialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.4 : 0, this.ctx.currentTime, 0.02);
    }
    return this.enabled;
  }
}
