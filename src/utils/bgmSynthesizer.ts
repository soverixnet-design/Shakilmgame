// Synthetic Room Background Music Generator (Web Audio API)

export type BgmTrack = 'none' | 'lofi' | 'night_adda' | 'acoustic';

class BgmSynthesizer {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  public currentTrack: BgmTrack = 'none';
  public volume: number = 0.05;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTrack(track: BgmTrack) {
    this.stop();
    this.currentTrack = track;
    if (track === 'none') return;

    this.initCtx();
    if (!this.ctx) return;

    // Track melody progressions
    const notesLofi = [261.63, 329.63, 392.0, 493.88, 523.25, 392.0]; // Cmaj7 notes
    const notesNight = [220.0, 261.63, 329.63, 440.0, 392.0, 349.23]; // Am / F
    const notesAcoustic = [196.0, 246.94, 293.66, 392.0, 493.88]; // G major

    const currentNotes = track === 'lofi' ? notesLofi : track === 'night_adda' ? notesNight : notesAcoustic;
    let step = 0;

    this.intervalId = setInterval(() => {
      if (!this.ctx || this.currentTrack === 'none') return;
      try {
        const freq = currentNotes[step % currentNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = 800; // Warm soft tone

        osc.type = track === 'lofi' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 2.0);

        step++;
      } catch {}
    }, 1200);
  }

  public stop() {
    this.currentTrack = 'none';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const bgmPlayer = new BgmSynthesizer();
