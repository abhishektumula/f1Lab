import { paintAsphalt } from "./asphalt";
import { CAR, type CarState } from "./physics";
import type { CarStyle } from "./profile";

// The pit lane is a strip down the right-hand edge of the screen. Park the car in the
// box and stay nearly still while the crew repairs it.

export interface PitLayout {
  laneX: number;
  laneW: number;
  box: { x: number; y: number; w: number; h: number };
}

export const PIT_MAX_SPEED = 45; // px/s, about 15 km/h

// Small damage is a quick stop, a wrecked car takes longer.
export const repairTime = (health: number) => 0.8 + (2.4 * (100 - health)) / 100;

export const PIT_MIN_WIDTH = 768; // below this the lane would cover the page, so there is none

export function pitLayout(w: number, h: number): PitLayout {
  if (w < PIT_MIN_WIDTH) return { laneX: w, laneW: 0, box: { x: w, y: 0, w: 0, h: 0 } };
  const laneW = Math.min(170, Math.max(110, w * 0.14));
  const boxH = Math.min(190, h * 0.3);
  return {
    laneX: w - laneW,
    laneW,
    box: { x: w - laneW + 12, y: h / 2 - boxH / 2, w: laneW - 24, h: boxH },
  };
}

export function inPitBox(car: CarState, layout: PitLayout) {
  const { x, y, w, h } = layout.box;
  return car.x > x && car.x < x + w && car.y > y && car.y < y + h;
}

// The static ground: open asphalt with the pit lane painted down the right side.
export function createTrackLayer(layout: PitLayout, w: number, h: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  paintAsphalt(ctx, 0, 0, w, h);
  if (layout.laneW > 0) paintPitLane(ctx, layout, h);
  return canvas;
}

// Static markings, painted once into the asphalt layer.
function paintPitLane(ctx: CanvasRenderingContext2D, layout: PitLayout, h: number) {
  const { laneX, laneW, box } = layout;

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(laneX, 0, laneW, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(laneX, 0, 3, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (let y = 0; y < h; y += 28) ctx.fillRect(laneX + 10, y, 3, 14);

  ctx.fillStyle = "#17181a";
  ctx.fillRect(laneX + laneW - 10, 0, 10, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.font = "800 38px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PIT", box.x + box.w / 2, box.y + box.h / 2);

  ctx.save();
  ctx.translate(laneX + laneW / 2 - 6, box.y - 56);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("PIT LANE", 0, 0);
  ctx.restore();
}

interface OverlayState {
  time: number;
  needsRepair: boolean;
  ready: boolean; // car is in the box and slow enough
  progress: number;
}

// Animated box outline: pulses when the car is damaged, fills as it is repaired.
export function drawPitOverlay(ctx: CanvasRenderingContext2D, layout: PitLayout, s: OverlayState) {
  if (layout.laneW === 0 || (!s.needsRepair && s.progress === 0)) return;
  const { x, y, w, h } = layout.box;

  if (s.ready) {
    ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + 0.25 * s.progress})`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }

  ctx.save();
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 + 0.4 * Math.sin(s.time * 4)})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -s.time * 30;
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 10);
  ctx.stroke();
  ctx.restore();
}

// Mechanics around the car while it is being repaired.
export function drawPitCrew(
  ctx: CanvasRenderingContext2D,
  car: CarState,
  style: CarStyle,
  progress: number,
  time: number,
) {
  const alpha = Math.min(1, progress * 6) * (progress > 0.92 ? (1 - progress) / 0.08 : 1);
  if (alpha <= 0) return;

  const wheelX = CAR.wheelbase / 2 + 4;
  const wheelY = CAR.halfTrack + 18;
  const crew: [number, number, boolean][] = [
    [-wheelX, -wheelY, true],
    [wheelX, -wheelY, true],
    [-wheelX, wheelY, true],
    [wheelX, wheelY, true],
    [66, 0, false],
    [-66, 0, false],
  ];

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);
  ctx.globalAlpha = alpha;

  crew.forEach(([x, y, hasGun], i) => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = style.dark;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.body;
    ctx.beginPath();
    ctx.ellipse(x, y, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.helmet;
    ctx.beginPath();
    ctx.arc(x, y, 3.8, 0, Math.PI * 2);
    ctx.fill();

    if (hasGun && Math.sin(time * 30 + i * 2) > 0) {
      ctx.fillStyle = "#ffd54a";
      ctx.fillRect(x - 1.5, y + (y < 0 ? 9 : -11), 3, 3);
    }
  });

  ctx.restore();
}
