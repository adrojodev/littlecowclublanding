import {
  type Polygon,
  type Point,
  R,
  WEDGE,
  clipToWedge,
  polygonArea,
  touchesEdge,
} from './geometry';

// Generate a playful random pattern: 4–7 shapes placed in the wedge,
// each clipped to it. A shape may touch at most one wedge edge so the
// cut paper always stays in one piece.

export function randomPattern(): Polygon[] {
  const shapes: Polygon[] = [];
  const target = 4 + Math.floor(Math.random() * 4);
  let guard = 0;
  while (shapes.length < target && guard++ < 80) {
    const shape = clipToWedge(randomShape());
    if (shape.length < 3) continue;
    if (Math.abs(polygonArea(shape)) < 40) continue;
    const edgesTouched = [
      touchesEdge(shape, WEDGE[0], WEDGE[1]), // vertical crease x = 0
      touchesEdge(shape, WEDGE[1], WEDGE[2]), // paper edge y = -R
      touchesEdge(shape, WEDGE[2], WEDGE[0]), // diagonal crease y = -x
    ].filter(Boolean).length;
    if (edgesTouched > 1) continue;
    if (overlapsExisting(shape, shapes)) continue;
    shapes.push(shape);
  }
  return shapes;
}

function overlapsExisting(shape: Polygon, shapes: Polygon[]): boolean {
  const [cx, cy] = centroid(shape);
  const r = radius(shape, cx, cy);
  return shapes.some((s) => {
    const [sx, sy] = centroid(s);
    return Math.hypot(sx - cx, sy - cy) < r + radius(s, sx, sy) + 4;
  });
}

function centroid(poly: Polygon): [number, number] {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return [x / poly.length, y / poly.length];
}

function radius(poly: Polygon, cx: number, cy: number): number {
  return Math.max(...poly.map((p) => Math.hypot(p.x - cx, p.y - cy)));
}

function randomShape(): Polygon {
  // Random spot inside the wedge: 0 <= x <= -y <= R, biased away from apex.
  const y = -(20 + Math.random() * (R - 24));
  const x = Math.random() * -y;
  const size = 7 + Math.random() * 15;
  const rot = Math.random() * Math.PI * 2;
  const kind = Math.floor(Math.random() * 4);
  switch (kind) {
    case 0:
      return regular(3, x, y, size, rot);
    case 1:
      return diamond(x, y, size, rot);
    case 2:
      return regular(6, x, y, size * 0.8, rot);
    default:
      return sliver(x, y, size, rot);
  }
}

function regular(n: number, cx: number, cy: number, r: number, rot: number): Polygon {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function diamond(cx: number, cy: number, r: number, rot: number): Polygon {
  const w = r * (0.4 + Math.random() * 0.4);
  const raw: Point[] = [
    { x: 0, y: -r },
    { x: w, y: 0 },
    { x: 0, y: r },
    { x: -w, y: 0 },
  ];
  return raw.map((p) => rotate(p, rot, cx, cy));
}

// A long thin notch — reads as an elegant slit when unfolded.
function sliver(cx: number, cy: number, r: number, rot: number): Polygon {
  const len = r * 1.8;
  const w = 2.5 + Math.random() * 3;
  const raw: Point[] = [
    { x: -len / 2, y: -w },
    { x: len / 2, y: 0 },
    { x: -len / 2, y: w },
  ];
  return raw.map((p) => rotate(p, rot, cx, cy));
}

function rotate(p: Point, a: number, cx: number, cy: number): Point {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c };
}
