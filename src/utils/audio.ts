/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEnabled: boolean = false;
  private masterGain: GainNode | null = null;

  // Background Music Sequencer properties
  private musicInterval: any = null;
  private nextNoteTime: number = 0;
  private noteStep: number = 0;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime); // Low master volume for safety
      this.masterGain.connect(this.ctx.destination);
      
      this.isEnabled = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggle(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startEngine();
    } else {
      this.stopEngine();
    }
  }

  getEnabled() {
    return this.isEnabled;
  }

  startMusic() {
    if (!this.isEnabled || !this.ctx) return;
    if (this.musicInterval) return;

    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.noteStep = 0;

    // Chords / Bass progression for "Kaash Koi Ladki Mujhe Pyaar Karti" (A minor / G major scale)
    const bassSeq = [
      // Am bass drive (0-15)
      110.00, 110.00, 110.00, 110.00, 110.00, 110.00, 110.00, 110.00,
      110.00, 110.00, 110.00, 110.00, 110.00, 110.00, 110.00, 110.00,
      // F to G bass drive (16-31)
      87.31, 87.31, 87.31, 87.31, 87.31, 87.31, 87.31, 87.31,
      98.00, 98.00, 98.00, 98.00, 98.00, 98.00, 98.00, 98.00,
      // Am - C instrumental drive (32-47)
      110.00, 110.00, 110.00, 110.00, 130.81, 130.81, 130.81, 130.81,
      110.00, 110.00, 110.00, 110.00, 130.81, 130.81, 130.81, 130.81,
      // G - Em instrumental drive (48-63)
      98.00, 98.00, 98.00, 98.00, 82.41, 82.41, 82.41, 82.41,
      98.00, 98.00, 98.00, 98.00, 110.00, 110.00, 110.00, 110.00
    ];

    // Accurate notes for the signature melody of "Kaash Koi Ladki Mujhe Pyaar Karti" plus the instrument solo
    const melodySeq = [
      // "Kaash koi ladki mujhe pyaar karti" (0-15)
      523.25, 523.25, 523.25, 493.88, 440.00, 0, 493.88, 523.25,
      440.00, 0, 392.00, 440.00, 0, 0, 0, 0,
      // "Kaash koi ladka mujhe pyaar karta" (16-31)
      493.88, 493.88, 493.88, 440.00, 392.00, 0, 440.00, 493.88,
      392.00, 0, 349.23, 392.00, 0, 0, 0, 0,
      // Flute instrumental solo - line 1 (32-47)
      440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 659.25,
      523.25, 587.33, 493.88, 523.25, 440.00, 0, 0, 0,
      // Flute instrumental solo - line 2 (48-63)
      392.00, 493.88, 587.33, 783.99, 698.46, 587.33, 523.25, 587.33,
      493.88, 523.25, 440.00, 0, 0, 0, 0, 0
    ];

    const lookAheadMs = 40;
    const scheduleAheadSeconds = 0.12;
    const stepDuration = 0.18; // 180ms translates to around 130 BPM upbeat rhythm

    const triggerStep = () => {
      if (!this.ctx || !this.masterGain || !this.isEnabled) return;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadSeconds) {
        const time = this.nextNoteTime;
        const currentStep = this.noteStep % 64;

        const currentBassFreq = bassSeq[currentStep];
        const currentMelFreq = melodySeq[currentStep];

        // 1. Play driving Synth Bass
        if (currentBassFreq > 0) {
          try {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(currentBassFreq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(140, time);
            filter.frequency.exponentialRampToValueAtTime(60, time + 0.15);

            gain.gain.setValueAtTime(0.04, time); // highly balanced warm baseline
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.17);
          } catch (e) {}
        }

        // 2. Play Soft Retro Synth Melody
        if (currentMelFreq > 0) {
          try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(currentMelFreq, time);

            gain.gain.setValueAtTime(0.018, time); // sweet and pleasant background melody
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.35);
          } catch (e) {}
        }

        // 3. Play Crisp Retro Hi-Hat
        if (currentStep % 4 === 2) {
          try {
            const hatOsc = this.ctx.createOscillator();
            const hatGain = this.ctx.createGain();

            hatOsc.type = 'triangle';
            hatOsc.frequency.setValueAtTime(9500, time);

            hatGain.gain.setValueAtTime(0.006, time); // crisp gentle driving percussion
            hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

            hatOsc.connect(hatGain);
            hatGain.connect(this.masterGain);

            hatOsc.start(time);
            hatOsc.stop(time + 0.05);
          } catch (e) {}
        }

        // Advance timing
        this.nextNoteTime += stepDuration;
        this.noteStep++;
      }
    };

    this.musicInterval = setInterval(triggerStep, lookAheadMs);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  startEngine() {
    if (!this.isEnabled || !this.ctx || this.engineOsc) return;

    this.startMusic();

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      // Sawtooth wave for a raspy engine sound
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // low idling rumble

      // Low pass filter to make the engine sound bassy and smooth
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      // Low baseline volume for idling
      this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      
      if (this.masterGain) {
        this.engineGain.connect(this.masterGain);
      }

      this.engineOsc.start();
    } catch (err) {
      console.error("Failed to start engine audio", err);
    }
  }

  stopEngine() {
    this.stopMusic();
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    if (this.engineFilter) {
      this.engineFilter.disconnect();
      this.engineFilter = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  updateEngine(speedRatio: number, nitroActive: boolean) {
    if (!this.isEnabled || !this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;

    const t = this.ctx.currentTime;
    
    // Smooth frequency change: from 45Hz (idling) up to 130Hz (top speed)
    const baseFreq = 45 + speedRatio * 85;
    // Vibrato effect to mimic gear shifting and cylinder firing
    const wobble = Math.sin(t * 20) * (5 + speedRatio * 8);
    const targetFreq = baseFreq + wobble + (nitroActive ? 30 : 0);
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.05);

    // Filter frequency adjusts upwards as speed increases (brighter sound)
    const filterFreq = 220 + speedRatio * 450 + (nitroActive ? 200 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    // volume increases slightly with speed
    const vol = 0.1 + speedRatio * 0.2 + (nitroActive ? 0.15 : 0);
    this.engineGain.gain.setTargetAtTime(vol, t, 0.1);
  }

  playCoin() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      
      // Nice classic "ping" arpeggio
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playBoost() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      
      // Rapid upward synth laser sweep
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.45);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  playCrash() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      
      // We will create synthesized brown/white noise for an explosive crash
      const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate noise values
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Simple low-pass filter to make it sound "brownish" and heavy
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // boost volume
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Add a lowpass filter to make the explosion deep
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.42);

      // Add a sharp low-frequency metallic ringing
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'sawtooth';
      ringOsc.frequency.setValueAtTime(100, now);
      ringOsc.frequency.linearRampToValueAtTime(30, now + 0.2);
      
      ringGain.gain.setValueAtTime(0.4, now);
      ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      ringOsc.connect(ringGain);
      ringGain.connect(this.masterGain);
      ringOsc.start(now);
      ringOsc.stop(now + 0.25);

    } catch (e) {}
  }

  playSlick() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      
      // Wobby slide frequency
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.45);
      
      // Wobbling LFO effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(15, now);
      lfoGain.gain.setValueAtTime(80, now);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      lfo.start(now);
      osc.start(now);
      
      lfo.stop(now + 0.5);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  playHeal() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      
      // Bright tech ascending arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      });

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playLevelUp() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Golden arpeggio chord: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        osc1.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc2.frequency.setValueAtTime(freq * 1.5, now + idx * 0.08); // perfect fifth harmonic
      });

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  }
}

export const audio = new AudioEngine();
