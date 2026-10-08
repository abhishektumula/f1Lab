// Seeded so the surface looks the same after a resize.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tarmac texture inside a rectangle: base tone, worn patches, aggregate speckle.
export function paintAsphalt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rand = mulberry32(1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = "#3a3c40";
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 8; i++) {
    const cx = x + rand() * w;
    const cy = y + rand() * h;
    const r = 80 + rand() * 120;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const tone = rand() < 0.5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${tone},0.05)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const specks = Math.round((w * h) / 70);
  for (let i = 0; i < specks; i++) {
    const v = 40 + Math.floor(rand() * 50);
    ctx.fillStyle = `rgba(${v},${v},${v + 3},${0.25 + rand() * 0.35})`;
    const s = 1 + rand() * 1.5;
    ctx.fillRect(x + rand() * w, y + rand() * h, s, s);
  }

  ctx.restore();
}
