import type { PolygonRegion, Scene } from "@/lib/geometry";
import { LOGICAL_SIZE, pointInConvexPolygon } from "@/lib/geometry";

export type RenderParams = {
  scene: Scene;
  dotRadiusLogical: number;
  gradientInterpolation: number;
  dotColor: string;
  showLines: boolean;
};

/** Fixed spacing for stipple candidate centers (logical px). Must not depend on dot radius or RNG consumption/order changes when the user resizes dots. */
const STIPPLE_GRID_STEP = 2;

/** Luminance 0 = dark, 1 = light. More dots where darker (classic stippling). */
function stippleAcceptance(luminance: number): number {
  const darkness = 1 - luminance;
  return Math.min(1, darkness * 0.98 + 0.002);
}

function applyGradientInterpolation(luminance: number, interpolation: number): number {
  const smooth = luminance * luminance * (3 - 2 * luminance);
  return luminance + (smooth - luminance) * interpolation;
}

/** Per-region projection of gradient along (dx,dy); avoids recomputing tMin/tMax per grid sample. */
function precomputeGradientProjection(region: PolygonRegion) {
  const dx = Math.cos(region.gradientAngleRad);
  const dy = Math.sin(region.gradientAngleRad);
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const v of region.vertices) {
    const t = v.x * dx + v.y * dy;
    tMin = Math.min(tMin, t);
    tMax = Math.max(tMax, t);
  }
  const span = tMax - tMin || 1;
  return { dx, dy, tMin, span, inverted: region.gradientInverted };
}

function rawLuminanceAt(
  p: { x: number; y: number },
  g: ReturnType<typeof precomputeGradientProjection>,
): number {
  const proj = p.x * g.dx + p.y * g.dy;
  let u = (proj - g.tMin) / g.span;
  u = Math.min(1, Math.max(0, u));
  return g.inverted ? 1 - u : u;
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  pixelSize: number,
  params: RenderParams,
  rng: () => number,
): void {
  const { scene, dotRadiusLogical, gradientInterpolation, dotColor, showLines } = params;
  const scale = pixelSize / LOGICAL_SIZE;
  const r = dotRadiusLogical;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

  const step = STIPPLE_GRID_STEP;

  ctx.fillStyle = dotColor;
  ctx.beginPath();

  for (const region of scene.regions) {
    const grad = precomputeGradientProjection(region);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const v of region.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }

    const jitterAmt = step * 0.35;
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    for (let x = startX; x <= maxX + step; x += step) {
      for (let y = startY; y <= maxY + step; y += step) {
        const jx = (rng() - 0.5) * 2 * jitterAmt;
        const jy = (rng() - 0.5) * 2 * jitterAmt;
        const px = x + jx;
        const py = y + jy;
        if (!pointInConvexPolygon({ x: px, y: py }, region.vertices)) continue;

        const rawLuminance = rawLuminanceAt({ x: px, y: py }, grad);
        const L = applyGradientInterpolation(rawLuminance, gradientInterpolation);
        const p = stippleAcceptance(L);
        if (rng() < p) {
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
    }
  }

  ctx.fill();

  if (showLines) {
    const lineWidthLogical = Math.max(1 / scale, 0.75);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = lineWidthLogical;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const ln of scene.lines) {
      ctx.moveTo(ln.p1.x, ln.p1.y);
      ctx.lineTo(ln.p2.x, ln.p2.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}
