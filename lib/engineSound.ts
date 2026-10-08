// Synthesised engine note plus tyre squeal. Created on a user gesture so the
// browser lets it play; starts muted until setMuted(false) is called.
export class EngineSound {
  private ctx = new AudioContext();
  private master = this.ctx.createGain();
  private filter = this.ctx.createBiquadFilter();
  private engineGain = this.ctx.createGain();
  private noiseGain = this.ctx.createGain();
  private saw = this.ctx.createOscillator();
  private sub = this.ctx.createOscillator();
  private muted = true;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const { ctx } = this;
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    this.saw.type = "sawtooth";
    this.sub.type = "square";
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    this.filter.type = "lowpass";
    this.filter.Q.value = 2;
    this.engineGain.gain.value = 0.08;

    this.saw.connect(this.filter);
    this.sub.connect(subGain).connect(this.filter);
    this.filter.connect(this.engineGain).connect(this.master);
    this.saw.start();
    this.sub.start();

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500;
    band.Q.value = 0.9;
    this.noiseGain.gain.value = 0;
    noise.connect(band).connect(this.noiseGain).connect(this.master);
    noise.start();

    void ctx.suspend();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    clearTimeout(this.suspendTimer);
    const t = this.ctx.currentTime;
    if (muted) {
      this.master.gain.setTargetAtTime(0, t, 0.02);
      this.suspendTimer = setTimeout(() => {
        if (this.muted) void this.ctx.suspend();
      }, 150);
    } else {
      void this.ctx.resume();
      this.master.gain.setTargetAtTime(0.5, t, 0.05);
    }
  }

  // rpm 0..1, throttle 0..1, skid 0..1. Tyre squeal still plays with the engine off.
  update(rpm: number, throttle: number, skid: number, running: boolean) {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    const freq = 70 + rpm * 380;
    this.saw.frequency.setTargetAtTime(freq, t, 0.03);
    this.sub.frequency.setTargetAtTime(freq * 0.5, t, 0.03);
    this.filter.frequency.setTargetAtTime(500 + rpm * 2200 + throttle * 800, t, 0.05);
    this.engineGain.gain.setTargetAtTime(running ? 0.08 + throttle * 0.1 : 0, t, 0.05);
    this.noiseGain.gain.setTargetAtTime(skid * 0.12, t, 0.05);
  }

  dispose() {
    clearTimeout(this.suspendTimer);
    void this.ctx.close();
  }
}
