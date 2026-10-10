// Synthetic Web Audio API Sound Generator (No external audio files needed)

class SoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(freq: number, duration: number, volume: number = 0.08, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio not permitted or supported
    }
  }

  public tick() {
    this.playTone(300, 0.03, 0.05, 'triangle');
  }

  public countdownTick() {
    this.playTone(660, 0.08, 0.08, 'sine');
  }

  public betPlace() {
    this.playTone(520, 0.06, 0.07, 'sine');
  }

  public spinWheel() {
    this.playTone(400, 0.05, 0.04, 'triangle');
  }

  public winFanfare() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 0.1, 'sine');
      }, idx * 90);
    });
  }

  public bigJackpot() {
    if (!this.enabled) return;
    const notes = [440, 554, 659, 880, 1108, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, 0.12, 'square');
      }, idx * 110);
    });
  }

  public coinFall() {
    this.playTone(987, 0.08, 0.05, 'sine');
  }

  public giftSent() {
    this.playTone(880, 0.15, 0.09, 'sine');
    setTimeout(() => this.playTone(1174, 0.2, 0.09, 'sine'), 100);
  }
}

export const sound = new SoundSystem();
