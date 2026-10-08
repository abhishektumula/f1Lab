import { CAR, type CarState } from "./physics";

const TYRE_WIDTH = 7;
const FADE_INTERVAL = 2; // seconds between fade steps
const FADE_AMOUNT = 0.06;

// Tyre contact points in the car's frame: [forward, right].
const TYRES: [number, number][] = [
  [CAR.wheelbase / 2, -CAR.halfTrack], // front left
  [CAR.wheelbase / 2, CAR.halfTrack], // front right
  [-CAR.wheelbase / 2, -CAR.halfTrack], // rear left
  [-CAR.wheelbase / 2, CAR.halfTrack], // rear right
];

const MAX_PIXELS = 16e6; // keeps the canvas inside what browsers allow, even on a long page

// Marks live on their own canvas covering the whole page. It is never cleared, only slowly
// faded, so the main loop just blits the visible part of it each frame.
export class SkidMarks {
  canvas = document.createElement("canvas");
  scale = 1;
  private ctx = this.canvas.getContext("2d")!;
  private last: ({ x: number; y: number } | null)[] = TYRES.map(() => null);
  private fadeTimer = 0;

  resize(w: number, h: number, dpr: number) {
    // Biggest scale (up to the screen's pixel ratio) that fits the pixel budget.
    const scale = [2, 1.5, 1, 0.75, 0.5].find((s) => s <= dpr && w * h * s * s <= MAX_PIXELS) ?? 0.5;

    // Keep existing marks when only the page height changed, drop them if the scale changed.
    const old = this.canvas.cloneNode() as HTMLCanvasElement;
    old.getContext("2d")!.drawImage(this.canvas, 0, 0);

    this.scale = scale;
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    if (old.width > 0 && Math.abs(old.width / w - scale) < 0.01) this.ctx.drawImage(old, 0, 0);
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  update(car: CarState, dt: number) {
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);

    TYRES.forEach(([fx, fy], i) => {
      const intensity = i < 2 ? car.skidFront : car.skidRear;
      const x = car.x + cos * fx - sin * fy;
      const y = car.y + sin * fx + cos * fy;

      if (intensity < 0.05) {
        this.last[i] = null;
        return;
      }
      const prev = this.last[i];
      if (prev) {
        this.ctx.strokeStyle = `rgba(8, 8, 10, ${0.15 + 0.55 * intensity})`;
        this.ctx.lineWidth = TYRE_WIDTH;
        this.ctx.lineCap = "butt";
        this.ctx.beginPath();
        this.ctx.moveTo(prev.x, prev.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }
      this.last[i] = { x, y };
    });

    this.fadeTimer += dt;
    if (this.fadeTimer >= FADE_INTERVAL) {
      this.fadeTimer = 0;
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.globalCompositeOperation = "destination-out";
      this.ctx.fillStyle = `rgba(0, 0, 0, ${FADE_AMOUNT})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }
}
