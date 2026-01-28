
"use client";

// Singleton AudioContext management to adhere to browser autoplay policies
class AudioEngine {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    // Ensure context is running (resume on user interaction)
    public async init() {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
    }

    private createOscillator(type: OscillatorType, freq: number, startTime: number) {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        return osc;
    }

    private createGain(startTime: number) {
        const ctx = this.getContext();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        return gain;
    }

    // --- Sound Effects ---

    public playPop() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Frequency drop for "pop"
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);

        // Short envelope
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    public playMagic() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = t + (i * 0.08);
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    public playGrowth() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.start(t);
        osc.stop(t + 0.35);
    }

    public playShrink() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.start(t);
        osc.stop(t + 0.25);
    }

    public playRainbow() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(ctx.destination);

            const freq = 300 + (i * 150);
            const startTime = t + (i * 0.05);

            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.35);
        }
    }

    public playRed() { this.playMagic(); } // Reuse
    public playPurple() { this.playMagic(); } // Reuse

    public playPresent() {
        this.playPop();
        setTimeout(() => this.playMagic(), 100);
    }

    public playSunshine() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;
        const notes = [784, 988, 1175, 1319]; // G5, B5, D6, E6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = t + (i * 0.06);
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    }

    public playHotdog() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Bouncy
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.3);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.start(t);
        osc.stop(t + 0.35);
    }

    public playError() {
        this.init();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(150, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.start(t);
        osc.stop(t + 0.15);
    }
}

// Export singleton
export const audioEngine = new AudioEngine();
