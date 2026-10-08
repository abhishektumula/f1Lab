// Top-down car model. Units are CSS pixels and seconds, car mass is 1.
//
// The car is a rigid body with two tyres (front and rear axle). Each tyre makes a sideways
// force from its slip angle, capped by a grip limit that is shared with whatever the tyre
// is also doing (driving, braking). That shared budget is what makes the rear step out
// under power, so holding throttle and steering gives a power slide, and a sustained one
// is a donut. The car faces +x at heading 0 and screen y points down, so positive
// heading turns clockwise.

export interface Input {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  engine: boolean; // engine is running
}

export interface CarState {
  x: number;
  y: number;
  heading: number;
  u: number; // velocity along the car (forward +)
  v: number; // velocity across the car (right +)
  omega: number; // yaw rate, rad/s
  steer: number; // front wheel angle, rad
  throttle: number; // smoothed 0..1
  braking: boolean;
  skidFront: number; // 0..1 how hard the front tyres are marking the road
  skidRear: number;
  health: number; // 0..100
}

export interface Impact {
  x: number;
  y: number;
  kmh: number;
  damage: number;
}

export const CAR = {
  length: 96,
  wheelbase: 56,
  halfTrack: 17,
};

export const MAX_SPEED = 900;
export const KMH_PER_PX = 0.34;
export const STEP = 1 / 240;

const A = CAR.wheelbase / 2; // CG to front axle
const B = CAR.wheelbase / 2; // CG to rear axle
const INERTIA = 900;
const YAW_DAMPING = 1.0;
const SLIDE_YAW_DAMPING = 6; // extra damping while the rear is sliding, keeps slides smooth

const ENGINE = 320;
const BRAKE = 800;
const HANDBRAKE = 140;
const REVERSE_ACCEL = 170;
const MAX_REVERSE = 180;
const COAST_DRAG = 0.22;
const ROLLING_RESISTANCE = 25;

const GRIP_FRONT = 560;
const GRIP_REAR = 600;
const SLIP_SCALE = 0.2; // slip angle at which a tyre reaches ~76% of its grip
const DRIVE_GRIP_COST = 3.5; // how much of the rear grip drive force eats
const SLIDE_GRIP = 0.35; // fraction of grip left when drive force has used it all
const MIN_SLIP_SPEED = 60;

const STEER_LOCK = 0.6;
const STEER_FALLOFF = 320;
const STEER_RATE = 8;

const WALL_MARGIN = 36;
const WALL_BOUNCE = 0.3;
const SAFE_IMPACT_KMH = 12;
const DAMAGE_PER_KMH = 0.35;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function createCar(x: number, y: number, heading: number): CarState {
  return {
    x,
    y,
    heading,
    u: 0,
    v: 0,
    omega: 0,
    steer: 0,
    throttle: 0,
    braking: false,
    skidFront: 0,
    skidRear: 0,
    health: 100,
  };
}

export const carSpeed = (car: CarState) => Math.hypot(car.u, car.v);

// A tyre's sideways force falls off a little once it is properly sliding, so a slide persists.
const tyreForce = (alpha: number, grip: number) =>
  -grip * (1 - 0.25 * smoothstep(0.3, 0.9, Math.abs(alpha))) * Math.tanh(alpha / SLIP_SCALE);

export function stepCar(
  car: CarState,
  input: Input,
  dt: number,
  bounds: { w: number; h: number },
): Impact | null {
  const { u, v, omega } = car;
  const speed = Math.hypot(u, v);
  const sign = u >= 0 ? 1 : -1;

  const power = input.engine ? 0.55 + 0.45 * (car.health / 100) : 0;
  const gas = input.throttle && !input.brake && input.engine;
  car.throttle += ((gas ? 1 : 0) - car.throttle) * Math.min(1, dt * 10);

  // Longitudinal forces along the car.
  let drive = 0;
  let brakeForce = 0;
  let braking = false;
  if (gas) {
    if (u < -5) {
      brakeForce = BRAKE;
      braking = true;
    } else {
      drive = ENGINE * car.throttle * power * Math.max(0, 1 - u / MAX_SPEED);
    }
  } else if (input.brake) {
    if (u > 5) {
      brakeForce = BRAKE;
      braking = true;
    } else if (input.engine && u > -MAX_REVERSE) {
      drive = -REVERSE_ACCEL * power;
    }
  } else {
    brakeForce = COAST_DRAG * Math.abs(u) + ROLLING_RESISTANCE;
  }
  const handbrake = input.handbrake ? HANDBRAKE : 0;
  // Never let braking push the car backwards within one step.
  const retard = Math.min(brakeForce + handbrake, Math.abs(u) / dt);

  const maxSteer = STEER_LOCK / (1 + Math.abs(u) / STEER_FALLOFF);

  // Grip left for cornering once the tyres have done their driving/braking work. Drive force
  // only breaks the rear loose while the wheels are turned: that is what makes a donut, and
  // it means the car straightens out again as soon as the steering is released.
  const hardBrake = braking ? brakeForce : 0;
  const turning = smoothstep(0.2, 0.7, Math.abs(car.steer) / maxSteer);
  const rearLoad = Math.abs(drive) * DRIVE_GRIP_COST * turning + hardBrake * 0.4 + handbrake;
  const frontLoad = hardBrake * 0.6;
  // A sliding tyre still grips a little, which is what keeps a power slide controllable.
  const rearGrip =
    Math.max(SLIDE_GRIP * GRIP_REAR, Math.sqrt(Math.max(0, GRIP_REAR ** 2 - rearLoad ** 2))) *
    (input.handbrake ? 0.3 : 1);
  const frontGrip =
    Math.sqrt(Math.max(0, GRIP_FRONT ** 2 - frontLoad ** 2)) * (0.8 + 0.2 * (car.health / 100));

  // Slip angles: where each axle is actually moving versus where its wheels point.
  const sd = Math.sin(car.steer);
  const cd = Math.cos(car.steer);
  const vFront = v + A * omega;
  const alphaF = Math.atan2(vFront * cd - u * sd, Math.max(Math.abs(u * cd + vFront * sd), MIN_SLIP_SPEED));
  const alphaR = Math.atan2(v - B * omega, Math.max(Math.abs(u), MIN_SLIP_SPEED));

  const forceFront = tyreForce(alphaF, frontGrip); // perpendicular to the front wheels
  const forceRear = tyreForce(alphaR, rearGrip);
  const frontX = -forceFront * sd;
  const frontY = forceFront * cd;

  const ax = drive - sign * retard + frontX + omega * v;
  const ay = frontY + forceRear - omega * u;
  const torque = A * frontY - B * forceRear;

  car.u += ax * dt;
  car.v += ay * dt;
  const damping = YAW_DAMPING + SLIDE_YAW_DAMPING * smoothstep(0.2, 0.6, Math.abs(alphaR));
  car.omega += (torque / INERTIA - damping * omega) * dt;

  // Near a standstill, tyre slip angles are meaningless: kill sideways creep and
  // steer kinematically so parking-speed manoeuvres behave.
  const crawl = 1 - smoothstep(30, 90, speed);
  if (crawl > 0) {
    car.v -= car.v * Math.min(1, 10 * crawl * dt);
    const kinematic = (car.u / CAR.wheelbase) * Math.tan(car.steer);
    car.omega += (kinematic - car.omega) * Math.min(1, 12 * crawl * dt);
  }

  // Steering: less lock at speed.
  const target = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * maxSteer;
  car.steer += (target - car.steer) * Math.min(1, dt * STEER_RATE);

  const cos = Math.cos(car.heading);
  const sin = Math.sin(car.heading);
  car.x += (car.u * cos - car.v * sin) * dt;
  car.y += (car.u * sin + car.v * cos) * dt;
  car.heading += car.omega * dt;

  const impact = collideWalls(car, bounds);

  // Skid marks: tyres at their grip limit, wheelspin off the line, or locked wheels under braking.
  const speedFade = smoothstep(10, 60, speed);
  const rearUse = Math.abs(forceRear) / Math.max(rearGrip, 1);
  const frontUse = Math.abs(forceFront) / Math.max(frontGrip, 1);
  const spin =
    drive > 0
      ? smoothstep(0.85, 1.05, (drive * DRIVE_GRIP_COST) / GRIP_REAR) * (1 - smoothstep(150, 330, speed))
      : 0;
  const lock =
    smoothstep(0.7, 1, frontLoad / GRIP_FRONT) * smoothstep(120, 400, Math.abs(u)) * (braking ? 1 : 0);
  const hand = input.handbrake ? smoothstep(60, 160, speed) * 0.9 : 0;
  car.skidRear = Math.max(smoothstep(0.8, 1, rearUse) * speedFade, spin * 0.8, lock * 0.8, hand);
  car.skidFront = Math.max(smoothstep(0.85, 1, frontUse) * speedFade, lock) * 0.85;
  car.braking = braking;

  return impact;
}

// Soft walls around the screen. Hitting one at speed bounces the car and damages it.
function collideWalls(car: CarState, bounds: { w: number; h: number }): Impact | null {
  const walls: [number, number, number][] = [
    [car.x - WALL_MARGIN, 1, 0],
    [bounds.w - WALL_MARGIN - car.x, -1, 0],
    [car.y - WALL_MARGIN, 0, 1],
    [bounds.h - WALL_MARGIN - car.y, 0, -1],
  ]; // [penetration (negative = outside), inward normal x, inward normal y]

  if (walls.every(([d]) => d >= 0)) return null;

  const cos = Math.cos(car.heading);
  const sin = Math.sin(car.heading);
  let vx = car.u * cos - car.v * sin;
  let vy = car.u * sin + car.v * cos;
  let hitSpeed = 0;

  for (const [d, nx, ny] of walls) {
    if (d >= 0) continue;
    car.x += nx * -d;
    car.y += ny * -d;
    const vn = vx * nx + vy * ny;
    if (vn < 0) {
      hitSpeed = Math.max(hitSpeed, -vn);
      vx -= (1 + WALL_BOUNCE) * vn * nx;
      vy -= (1 + WALL_BOUNCE) * vn * ny;
    }
  }
  if (hitSpeed === 0) return null;

  car.u = vx * cos + vy * sin;
  car.v = -vx * sin + vy * cos;
  car.omega *= 0.6;

  const kmh = hitSpeed * KMH_PER_PX;
  const damage = Math.max(0, kmh - SAFE_IMPACT_KMH) * DAMAGE_PER_KMH;
  if (damage <= 0) return null;
  car.health = Math.max(0, car.health - damage);
  return { x: car.x, y: car.y, kmh, damage };
}

const GEARS = 8;
const IDLE_RPM = 0.4;

export type Gear = number | "N" | "R";

// Gear and rev level are derived from speed, like a real car's fixed ratios.
export function drivetrain(forward: number, throttle: number): { gear: Gear; rpm: number } {
  const speed = Math.abs(forward);
  if (forward < -5) {
    return { gear: "R", rpm: IDLE_RPM + 0.4 * Math.min(speed / MAX_REVERSE, 1) };
  }
  if (speed < 5 && throttle < 0.05) return { gear: "N", rpm: IDLE_RPM };

  const span = (MAX_SPEED * 0.9) / GEARS;
  const gear = Math.min(GEARS, Math.floor(speed / span) + 1);
  const lower = (gear - 1) * span;
  const upper = gear === GEARS ? MAX_SPEED : gear * span;
  const frac = clamp((speed - lower) / (upper - lower), 0, 1);
  let rpm = IDLE_RPM + 0.6 * frac;
  if (gear === 1) rpm = Math.max(rpm, IDLE_RPM + 0.35 * throttle);
  return { gear, rpm };
}
