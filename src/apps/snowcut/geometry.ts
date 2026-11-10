// Pattern space: the folded wedge is one octant of the square sheet.
// Apex C = (0,0) is the CENTER of the unfolded square. R = 100 pattern
// units = half the square's side. Wedge vertices:
//   C = (0, 0)        apex (paper center)
//   M = (0, -R)       top-edge midpoint (fold crease along x = 0)
//   K = (R, -R)       top-right corner (fold crease along y = -x)
// The segment M–K (y = -R) is the actual paper edge.
// Folding the square in half three times (vertical, horizontal, diagonal)
// stacks all 8 octants onto this wedge, so the unfolded pattern is the
// 8 images of each shape under the D4 symmetry group.

export type Point = { x: number; y: number };
export type Polygon = Point[];

export const R = 100;

export const WEDGE: Polygon = [
  { x: 0, y: 0 },
  { x: 0, y: -R },
  { x: R, y: -R },
];

// The 8 signed-permutation transforms of D4.
export const D4: Array<(p: Point) => Point> = [
  (p) => ({ x: p.x, y: p.y }),
  (p) => ({ x: -p.x, y: p.y }),
  (p) => ({ x: p.x, y: -p.y }),
  (p) => ({ x: -p.x, y: -p.y }),
  (p) => ({ x: p.y, y: p.x }),
  (p) => ({ x: -p.y, y: p.x }),
  (p) => ({ x: p.y, y: -p.x }),
  (p) => ({ x: -p.y, y: -p.x }),
];

export function transformPolygon(poly: Polygon, t: (p: Point) => Point): Polygon {
  return poly.map(t);
}

export function polygonArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPolygon(pt: Point, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Sutherland–Hodgman clip of a polygon against the wedge triangle.
export function clipToWedge(poly: Polygon): Polygon {
  let out = poly;
  const n = WEDGE.length;
  for (let i = 0; i < n && out.length > 0; i++) {
    const a = WEDGE[i];
    const b = WEDGE[(i + 1) % n];
    out = clipAgainstEdge(out, a, b);
  }
  return out;
}

// Keep the side of edge a→b that contains the wedge interior.
// WEDGE is wound so the interior is on the left of each edge
// (cross product >= 0).
function clipAgainstEdge(poly: Polygon, a: Point, b: Point): Polygon {
  const inside = (p: Point) =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
  const intersect = (p: Point, q: Point): Point => {
    const dx1 = b.x - a.x;
    const dy1 = b.y - a.y;
    const dx2 = q.x - p.x;
    const dy2 = q.y - p.y;
    const denom = dx1 * dy2 - dy1 * dx2;
    const t = ((a.x - p.x) * dy1 - (a.y - p.y) * dx1) / -denom;
    return { x: p.x + t * dx2, y: p.y + t * dy2 };
  };
  const out: Polygon = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

// Ramer–Douglas–Peucker simplification for freehand strokes.
export function simplify(poly: Polygon, epsilon: number): Polygon {
  if (poly.length < 4) return poly;
  const keep = new Array(poly.length).fill(false);
  keep[0] = keep[poly.length - 1] = true;
  const stack: Array<[number, number]> = [[0, poly.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = pointLineDistance(poly[i], poly[s], poly[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return poly.filter((_, i) => keep[i]);
}

function pointLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / len;
}

export function polygonToPath(poly: Polygon): string {
  if (poly.length === 0) return '';
  return (
    'M' +
    poly.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L') +
    'Z'
  );
}

// True if the shape touches (comes within eps of) the given wedge edge.
// Used to keep random shapes from severing the paper by bridging two edges.
export function touchesEdge(poly: Polygon, a: Point, b: Point, eps = 2): boolean {
  return poly.some((p) => pointLineDistance(p, a, b) < eps);
}
