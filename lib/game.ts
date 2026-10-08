import { drawCar } from "./drawCar";
import type { EngineSound } from "./engineSound";
import {
  KMH_PER_PX,
  STEP,
  carSpeed,
  createCar,
  drivetrain,
  stepCar,
  type Gear,
  type Impact,
  type Input,
} from "./physics";
import { Particles } from "./particles";
import {
  PIT_MAX_SPEED,
  drawPitCrew,
  createTrackLayer,
  drawPitOverlay,
  inPitBox,
  pitLayout,
  repairTime,
  type PitLayout,
} from "./pit";
import { DEFAULT_PROFILE, carStyle, type CarStyle, type Profile } from "./profile";
import { SkidMarks } from "./skidMarks";

export interface HudData {
  speed: number;
  gear: Gear;
  rpm: number;
  health: number;
  engineOn: boolean;
  startHold: number; // 0..1 progress of holding Space to start
  stopHold: number; // 0..1 progress of holding Tab to stop
  pitProgress: number; // 0..1 while being repaired
  pitDone: boolean; // briefly true after a finished stop
  hits: number; // counts wall impacts, used to retrigger the hit flash
  driven: boolean; // the player has moved the car with the engine running
}

export interface PressedKeys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  space: boolean;
  tab: boolean;
}

interface GameHooks {
  onHud: (hud: HudData) => void;
  onKeys: (keys: PressedKeys) => void;
  getSound: () => EngineSound | null;
}

type DriveFlag = "throttle" | "brake" | "left" | "right" | "handbrake";

const DRIVE_KEYS: Record<string, DriveFlag> = {
  ArrowUp: "throttle",
  KeyW: "throttle",
  ArrowDown: "brake",
  KeyS: "brake",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ShiftLeft: "handbrake",
  ShiftRight: "handbrake",
};

const START_TIME = 0.9; // seconds holding Space
const STOP_TIME = 0.6; // seconds holding Tab
const PIT_DONE_FLASH = 2.5;
const SMOKE_BELOW_HEALTH = 45;

export class Game {
  private ctx: CanvasRenderingContext2D;
  private skid = new SkidMarks();
  private particles = new Particles();
  private car = createCar(0, 0, -Math.PI / 2);
  private input: Input = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
    engine: false,
  };
  private held = new Set<string>();
  private lastKeys = "";

  private w = 0;
  private h = 0;
  private dpr = 1;
  private track!: HTMLCanvasElement;
  private pit!: PitLayout;

  private engineOn = false;
  private startHold = 0;
  private stopHold = 0;
  private rpm = 0;
  private gear: Gear = "N";

  private repairing = false;
  private repairFrom = 100;
  private pitProgress = 0;
  private pitDoneTimer = 0;
  private prevHealth = 100;
  private smokeTimer = 0;
  private hits = 0;
  private driven = false;

  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private hudTimer = 0;
  private lastHud = "";

  private style: CarStyle = carStyle(DEFAULT_PROFILE);

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: GameHooks,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  setProfile(profile: Profile) {
    this.style = carStyle(profile);
  }

  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const first = this.w === 0;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.pit = pitLayout(this.w, this.h);
    this.track = createTrackLayer(this.pit, this.w, this.h, this.dpr);
    this.skid.resize(this.w, this.h, this.dpr);
    if (first) {
      this.car.x = (this.w - this.pit.laneW) / 2;
      this.car.y = this.h * 0.4;
    } else {
      this.car.x = Math.min(this.car.x, this.w - 36);
      this.car.y = Math.min(this.car.y, this.h - 36);
    }
  }

  toggleEngine() {
    if (this.engineOn) {
      this.engineOn = false;
      this.stopHold = 0;
    } else {
      this.engineOn = true;
      this.startHold = 0;
    }
  }

  // Returns true when the key is one the game uses, so the caller can stop the browser reacting to it.
  keyDown(code: string) {
    if (code === "Space" || code === "Tab") {
      this.held.add(code);
    } else if (DRIVE_KEYS[code]) {
      this.input[DRIVE_KEYS[code]] = true;
    } else {
      return false;
    }
    this.notifyKeys();
    return true;
  }

  keyUp(code: string) {
    if (code === "Space" || code === "Tab") {
      this.held.delete(code);
    } else if (DRIVE_KEYS[code]) {
      this.input[DRIVE_KEYS[code]] = false;
    } else {
      return false;
    }
    this.notifyKeys();
    return true;
  }

  releaseAll() {
    this.held.clear();
    this.input.throttle = false;
    this.input.brake = false;
    this.input.left = false;
    this.input.right = false;
    this.input.handbrake = false;
    this.notifyKeys();
  }

  private notifyKeys() {
    const keys: PressedKeys = {
      up: this.input.throttle,
      down: this.input.brake,
      left: this.input.left,
      right: this.input.right,
      handbrake: this.input.handbrake,
      space: this.held.has("Space"),
      tab: this.held.has("Tab"),
    };
    const key = JSON.stringify(keys);
    if (key === this.lastKeys) return;
    this.lastKeys = key;
    this.hooks.onKeys(keys);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;

    this.update(dt);
    this.render();
    this.pushHud(dt);
  };

  private update(dt: number) {
    const { car } = this;

    this.updateEngine(dt);
    this.input.engine = this.engineOn;
    if (this.engineOn && (this.input.throttle || this.input.brake)) this.driven = true;

    this.acc += dt;
    while (this.acc >= STEP) {
      const impact = stepCar(car, this.input, STEP, { w: this.w, h: this.h });
      if (impact) this.onImpact(impact);
      this.acc -= STEP;
    }
    this.skid.update(car, dt);

    this.updatePit(dt);
    this.updateDamageEffects(dt);
    this.particles.update(dt);

    const drive = drivetrain(car.u, car.throttle);
    this.gear = this.engineOn ? drive.gear : "N";
    let targetRpm = 0;
    if (this.engineOn) targetRpm = drive.rpm;
    else if (this.startHold > 0) targetRpm = 0.12 + 0.3 * this.startHold;
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 12);

    this.hooks
      .getSound()
      ?.update(this.rpm, car.throttle, Math.max(car.skidFront, car.skidRear), this.engineOn || this.startHold > 0);
  }

  // Hold Space to crank and start, hold Tab to shut the engine off.
  private updateEngine(dt: number) {
    if (!this.engineOn) {
      if (this.held.has("Space")) this.startHold = Math.min(1, this.startHold + dt / START_TIME);
      else this.startHold = Math.max(0, this.startHold - dt * 2.5);
      if (this.startHold >= 1) {
        this.engineOn = true;
        this.startHold = 0;
      }
    } else {
      if (this.held.has("Tab")) this.stopHold = Math.min(1, this.stopHold + dt / STOP_TIME);
      else this.stopHold = Math.max(0, this.stopHold - dt * 2.5);
      if (this.stopHold >= 1) {
        this.engineOn = false;
        this.stopHold = 0;
      }
    }
  }

  private updatePit(dt: number) {
    const { car } = this;
    this.pitDoneTimer = Math.max(0, this.pitDoneTimer - dt);

    const canRepair = car.health < 100 && inPitBox(car, this.pit) && carSpeed(car) < PIT_MAX_SPEED;
    if (!canRepair) {
      this.repairing = false;
      this.pitProgress = 0;
      return;
    }
    if (!this.repairing) {
      this.repairing = true;
      this.repairFrom = car.health;
      this.pitProgress = 0;
    }
    this.pitProgress = Math.min(1, this.pitProgress + dt / repairTime(this.repairFrom));
    car.health = this.repairFrom + (100 - this.repairFrom) * this.pitProgress;
    if (this.pitProgress >= 1) {
      car.health = 100;
      this.repairing = false;
      this.pitProgress = 0;
      this.pitDoneTimer = PIT_DONE_FLASH;
    }
  }

  private onImpact(impact: Impact) {
    this.hits++;
    this.particles.sparks(impact.x, impact.y, Math.min(40, 6 + impact.kmh * 0.25));
    if (this.car.health <= 0 && this.engineOn) {
      this.engineOn = false;
      this.particles.sparks(impact.x, impact.y, 40);
    }
  }

  private updateDamageEffects(dt: number) {
    const { car } = this;
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);
    const worldVx = car.u * cos - car.v * sin;
    const worldVy = car.u * sin + car.v * cos;

    // Parts fly off as health crosses the thresholds where the car's look changes.
    for (const threshold of [50, 25, 0.01]) {
      if (this.prevHealth >= threshold && car.health < threshold) {
        this.particles.debris(car.x + cos * 46, car.y + sin * 46, this.style.body, 8);
        this.particles.sparks(car.x + cos * 46, car.y + sin * 46, 14);
      }
    }
    this.prevHealth = car.health;

    const smoking = car.health < SMOKE_BELOW_HEALTH && (this.engineOn || car.health <= 0);
    if (!smoking) return;
    const severity = 1 - car.health / SMOKE_BELOW_HEALTH;
    this.smokeTimer -= dt;
    while (this.smokeTimer <= 0) {
      this.smokeTimer += 0.13 - 0.1 * severity;
      this.particles.smoke(
        car.x - cos * 20,
        car.y - sin * 20,
        worldVx,
        worldVy,
        car.health < 20 ? 1 : severity,
      );
    }
  }

  private render() {
    const { ctx, car } = this;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.track, 0, 0, this.w, this.h);
    ctx.drawImage(this.skid.canvas, 0, 0, this.w, this.h);
    drawPitOverlay(ctx, this.pit, {
      time: this.time,
      needsRepair: car.health < 100,
      ready: this.repairing,
      progress: this.pitProgress,
    });
    drawCar(ctx, car, this.style);
    if (this.repairing) drawPitCrew(ctx, car, this.style, this.pitProgress, this.time);
    this.particles.draw(ctx);
  }

  private pushHud(dt: number) {
    this.hudTimer += dt;
    if (this.hudTimer < 0.05) return;
    this.hudTimer = 0;

    const round = (n: number) => Math.round(n * 50) / 50;
    const hud: HudData = {
      speed: Math.round(carSpeed(this.car) * KMH_PER_PX),
      gear: this.gear,
      rpm: round(this.rpm),
      health: Math.round(this.car.health),
      engineOn: this.engineOn,
      startHold: round(this.startHold),
      stopHold: round(this.stopHold),
      pitProgress: round(this.pitProgress),
      pitDone: this.pitDoneTimer > 0,
      hits: this.hits,
      driven: this.driven,
    };
    const key = JSON.stringify(hud);
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.hooks.onHud(hud);
  }
}

export const INITIAL_HUD: HudData = {
  speed: 0,
  gear: "N",
  rpm: 0,
  health: 100,
  engineOn: false,
  startHold: 0,
  stopHold: 0,
  pitProgress: 0,
  pitDone: false,
  hits: 0,
  driven: false,
};
