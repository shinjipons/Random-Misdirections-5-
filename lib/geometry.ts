import { mulberry32 } from "@/lib/random";

export type Vec2 = { x: number; y: number };

export type LineCoeff = { a: number; b: number; c: number };

/** Chord across the square (two perimeter points on different edges). */
export type CanvasLine = LineCoeff & { p1: Vec2; p2: Vec2 };

export type PolygonRegion = {
  vertices: Vec2[];
  gradientAngleRad: number;
  gradientInverted: boolean;
};

export type Scene = {
  regions: PolygonRegion[];
  lines: CanvasLine[];
};

const EPS = 1e-9;
const MIN_AREA = 1e-6;

export const LOGICAL_SIZE = 500;

export function lineEval(a: number, b: number, c: number, p: Vec2): number {
  return a * p.x + b * p.y + c;
}

export function lineFromChord(p1: Vec2, p2: Vec2): LineCoeff {
  const a = p2.y - p1.y;
  const b = p1.x - p2.x;
  const c = p2.x * p1.y - p1.x * p2.y;
  return { a, b, c };
}

function edgePoint(edge: number, t: number, s: number): Vec2 {
  switch (edge) {
    case 0:
      return { x: t * s, y: 0 };
    case 1:
      return { x: s, y: t * s };
    case 2:
      return { x: (1 - t) * s, y: s };
    default:
      return { x: 0, y: (1 - t) * s };
  }
}

/** Random chord between two distinct edges so the line crosses the interior. */
export function randomChord(rng: () => number, s: number): { p1: Vec2; p2: Vec2 } {
  const e1 = Math.floor(rng() * 4);
  let e2 = Math.floor(rng() * 4);
  while (e2 === e1) e2 = Math.floor(rng() * 4);
  const p1 = edgePoint(e1, rng(), s);
  const p2 = edgePoint(e2, rng(), s);
  return { p1, p2 };
}

function intersectSegmentLine(s: Vec2, e: Vec2, a: number, b: number, c: number): Vec2 | null {
  const fs = lineEval(a, b, c, s);
  const fe = lineEval(a, b, c, e);
  const denom = fe - fs;
  if (Math.abs(denom) < 1e-12) return null;
  let t = -fs / denom;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return { x: s.x + t * (e.x - s.x), y: s.y + t * (e.y - s.y) };
}

export function dedupePolygon(poly: Vec2[]): Vec2[] {
  if (poly.length === 0) return [];
  const out: Vec2[] = [];
  const eps = 1e-7;
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > eps) out.push(p);
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= eps) out.pop();
  }
  return out;
}

export function polygonArea(poly: Vec2[]): number {
  let sum = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return sum / 2;
}

export function clipPolygonToHalfPlane(
  poly: Vec2[],
  a: number,
  b: number,
  c: number,
  keepPositive: boolean,
): Vec2[] {
  const inside = (p: Vec2) => {
    const v = lineEval(a, b, c, p);
    return keepPositive ? v >= -EPS : v <= EPS;
  };

  const output: Vec2[] = [];
  const n = poly.length;
  if (n === 0) return output;

  for (let i = 0; i < n; i++) {
    const prev = poly[(i + n - 1) % n];
    const curr = poly[i];
    const prevIn = inside(prev);
    const currIn = inside(curr);

    if (currIn) {
      if (!prevIn) {
        const hit = intersectSegmentLine(prev, curr, a, b, c);
        if (hit) output.push(hit);
      }
      output.push(curr);
    } else if (prevIn) {
      const hit = intersectSegmentLine(prev, curr, a, b, c);
      if (hit) output.push(hit);
    }
  }

  return dedupePolygon(output);
}

function splitPolygonsWithLine(polys: Vec2[][], a: number, b: number, c: number): Vec2[][] {
  const next: Vec2[][] = [];
  for (const poly of polys) {
    const pos = clipPolygonToHalfPlane(poly, a, b, c, true);
    const neg = clipPolygonToHalfPlane(poly, a, b, c, false);
    if (pos.length >= 3 && Math.abs(polygonArea(pos)) > MIN_AREA) next.push(pos);
    if (neg.length >= 3 && Math.abs(polygonArea(neg)) > MIN_AREA) next.push(neg);
  }
  return next;
}

function initialSquare(s: number): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: s, y: 0 },
    { x: s, y: s },
    { x: 0, y: s },
  ];
}

/** Convex polygon point-in-polygon (consistent winding). */
export function pointInConvexPolygon(p: Vec2, poly: Vec2[]): boolean {
  const n = poly.length;
  if (n < 3) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < EPS) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
}

export function gradientScalarAt(
  p: Vec2,
  region: Pick<PolygonRegion, "vertices" | "gradientAngleRad" | "gradientInverted">,
): number {
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
  let u = (p.x * dx + p.y * dy - tMin) / span;
  u = Math.min(1, Math.max(0, u));
  return region.gradientInverted ? 1 - u : u;
}

export function buildScene(seed: number, lineCount: number, size = LOGICAL_SIZE): Scene {
  const rng = mulberry32(seed >>> 0);
  const lines: CanvasLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const { p1, p2 } = randomChord(rng, size);
    const coeff = lineFromChord(p1, p2);
    lines.push({ ...coeff, p1, p2 });
  }

  let polys: Vec2[][] = [initialSquare(size)];
  for (const ln of lines) {
    polys = splitPolygonsWithLine(polys, ln.a, ln.b, ln.c);
  }

  const regions: PolygonRegion[] = polys.map((vertices) => ({
    vertices,
    gradientAngleRad: rng() * Math.PI * 2,
    gradientInverted: rng() < 0.5,
  }));

  return { regions, lines };
}
