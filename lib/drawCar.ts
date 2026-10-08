import { CAR, type CarState } from "./physics";
import type { CarStyle } from "./profile";

const TYRE_X = CAR.wheelbase / 2;
const TYRES: [number, number, number, number][] = [
  [-TYRE_X, -CAR.halfTrack, 18, 11],
  [-TYRE_X, CAR.halfTrack, 18, 11],
  [TYRE_X, -CAR.halfTrack, 17, 9.5],
  [TYRE_X, CAR.halfTrack, 17, 9.5],
];

// Half outline of the body (nose to tail, upper side); mirrored for the other half.
const HALF_BODY: [number, number][] = [
  [44, 0],
  [36, 2.2],
  [22, 4.5],
  [14, 9],
  [4, 12],
  [-14, 12],
  [-28, 8],
  [-42, 4],
  [-44, 0],
];

// Fixed scratch marks; more of them show as health drops.
const SCRATCHES: [number, number, number, number][] = [
  [-30, -7, -14, -5],
  [8, 8, 20, 6],
  [-8, 9, 2, 10.5],
  [24, -3, 34, -2],
  [-36, 3, -24, 5],
];

function bodyPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  HALF_BODY.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = HALF_BODY.length - 1; i >= 0; i--) {
    ctx.lineTo(HALF_BODY[i][0], -HALF_BODY[i][1]);
  }
  ctx.closePath();
}

function tyre(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#0d0d0e";
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length, width, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#2b2b2e";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawCar(ctx: CanvasRenderingContext2D, car: CarState, style: CarStyle) {
  const health = car.health;

  // Damage shows up as a shorter front wing and a bent rear wing.
  const frontLeft = health >= 25 ? 20 : 8;
  const frontRight = health >= 50 ? 20 : health >= 25 ? 10 : 0;
  const rearRight = health >= 35 ? 19 : 4;

  // Shadow: offset in world space so the light stays put as the car turns.
  ctx.save();
  ctx.translate(car.x + 4, car.y + 6);
  ctx.rotate(car.heading);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  bodyPath(ctx);
  ctx.fill();
  ctx.fillRect(-51, -19, 9, 19 + rearRight);
  ctx.fillRect(40, -frontLeft, 7, frontLeft + frontRight);
  for (const [x, y, l, w] of TYRES) ctx.fillRect(x - l / 2, y - w / 2, l, w);
  ctx.restore();

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);

  // Wheels and axles.
  ctx.strokeStyle = style.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-TYRE_X, -CAR.halfTrack);
  ctx.lineTo(-TYRE_X, CAR.halfTrack);
  ctx.moveTo(TYRE_X, -CAR.halfTrack);
  ctx.lineTo(TYRE_X, CAR.halfTrack);
  ctx.stroke();
  tyre(ctx, TYRES[0][0], TYRES[0][1], TYRES[0][2], TYRES[0][3], 0);
  tyre(ctx, TYRES[1][0], TYRES[1][1], TYRES[1][2], TYRES[1][3], 0);
  tyre(ctx, TYRES[2][0], TYRES[2][1], TYRES[2][2], TYRES[2][3], car.steer);
  tyre(ctx, TYRES[3][0], TYRES[3][1], TYRES[3][2], TYRES[3][3], car.steer);

  // Rear wing.
  ctx.fillStyle = style.dark;
  ctx.fillRect(-51, -19, 9, 19 + rearRight);
  ctx.fillStyle = style.body;
  ctx.fillRect(-52, -20, 11, 2.5);
  if (rearRight === 19) ctx.fillRect(-52, 17.5, 11, 2.5);

  // Brake light.
  if (car.braking) {
    ctx.save();
    ctx.shadowColor = "#ff2a2a";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(-52.5, -3, 2, 6);
    ctx.restore();
  }

  // Body.
  bodyPath(ctx);
  ctx.fillStyle = style.body;
  ctx.fill();

  // Accent nose band, scratches and a dent, all clipped to the body.
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  ctx.fillStyle = style.accent;
  ctx.fillRect(32, -10, 20, 20);

  const wear = 1 - health / 100;
  if (health < 85) {
    ctx.strokeStyle = `rgba(0, 0, 0, ${Math.min(0.6, wear * 0.9)})`;
    ctx.lineWidth = 1.2;
    const count = Math.min(SCRATCHES.length, Math.ceil(wear * 7));
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of SCRATCHES.slice(0, count)) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
  if (health < 50) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 7);
    ctx.lineTo(14, 13);
    ctx.fill();
  }
  if (health <= 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(-50, -15, 100, 30);
  }
  ctx.restore();

  bodyPath(ctx);
  ctx.strokeStyle = style.bodyEdge;
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Sidepod inlets.
  ctx.fillStyle = style.dark;
  ctx.fillRect(12, -10.5, 3, 4);
  ctx.fillRect(12, 6.5, 3, 4);

  // Front wing.
  ctx.fillStyle = style.dark;
  ctx.fillRect(40, -frontLeft, 7, frontLeft + frontRight);
  ctx.fillStyle = style.body;
  if (frontLeft === 20) ctx.fillRect(39, -20.5, 9, 2.5);
  if (frontRight === 20) ctx.fillRect(39, 18, 9, 2.5);

  // Cockpit, halo and helmet.
  ctx.fillStyle = style.dark;
  ctx.beginPath();
  ctx.roundRect(-7, -4.5, 16, 9, 4);
  ctx.fill();
  ctx.fillStyle = style.helmet;
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a8a8f";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, 0);
  ctx.moveTo(8, 0);
  ctx.lineTo(1, -5);
  ctx.moveTo(8, 0);
  ctx.lineTo(1, 5);
  ctx.stroke();

  // Race number on the engine cover.
  ctx.save();
  ctx.translate(-20, 0);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = style.numberColor;
  ctx.font = `bold ${style.number > 9 ? 10 : 12}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(style.number), 0, 0);
  ctx.restore();

  ctx.restore();
}
