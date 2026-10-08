type Kind = "spark" | "smoke" | "debris";

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
}

const MAX_PARTICLES = 400;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Sparks and debris from impacts, smoke from a damaged engine.
export class Particles {
  private list: Particle[] = [];

  private add(p: Particle) {
    this.list.push(p);
    if (this.list.length > MAX_PARTICLES) this.list.shift();
  }

  sparks(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(80, 360);
      const max = rand(0.2, 0.55);
      this.add({
        kind: "spark",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: max,
        max,
        size: rand(1, 2.2),
        color: Math.random() < 0.5 ? "#ffd54a" : "#ff8a2a",
        angle: 0,
        spin: 0,
      });
    }
  }

  debris(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 260);
      const max = rand(1.2, 2.4);
      this.add({
        kind: "debris",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: max,
        max,
        size: rand(2, 5),
        color: Math.random() < 0.7 ? color : "#1b1b1d",
        angle: rand(0, Math.PI),
        spin: rand(-12, 12),
      });
    }
  }

  // darkness 0 = light grey, 1 = black
  smoke(x: number, y: number, vx: number, vy: number, darkness: number) {
    const max = rand(0.8, 1.5);
    const tone = Math.round(150 - darkness * 130);
    this.add({
      kind: "smoke",
      x,
      y,
      vx: vx * 0.3 + rand(-15, 15),
      vy: vy * 0.3 + rand(-15, 15),
      life: max,
      max,
      size: rand(5, 9),
      color: `${tone}, ${tone}, ${tone}`,
      angle: 0,
      spin: 0,
    });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === "smoke" ? 1.2 : p.kind === "spark" ? 2.5 : 3;
      const k = Math.max(0, 1 - drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.angle += p.spin * dt;
      if (p.kind === "smoke") p.size += 22 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const t = p.life / p.max;
      if (p.kind === "smoke") {
        ctx.fillStyle = `rgba(${p.color}, ${0.4 * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.min(1, t * 1.5);
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        ctx.restore();
      }
    }
  }
}
