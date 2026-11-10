import type { jsPDF } from 'jspdf';
import { type Polygon, R } from './geometry';
import { pdfSteps } from './i18n';

export type Paper = 'letter' | 'a4';

// The whole sheet is black & white and ink-light: the square uses the
// full printable width and sits at the top; everything else is plain
// text on the bottom strip, which gets cut off before folding.
//
// Fold sequence (all folds go BEHIND so the printed side stays outside):
//   1. bottom edge behind, up to the top      -> top half in front
//   2. left side behind, over to the right    -> top-right quarter in front
//   3. bottom-right corner behind, on the slant -> printed octant on top
// The pattern octant is C(0,0)-M(0,-R)-K(R,-R) in pattern space, which
// lands exactly on the front of that final wedge, ink out.

// jsPDF is loaded on demand: it is only needed once someone prints.
export async function downloadPdf(shapes: Polygon[], paper: Paper): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: paper });
  const pageW = doc.internal.pageSize.getWidth();

  // The square IS the top of the sheet: the paper's own left, right and
  // top edges are three of its sides, so the only printed edge is the
  // cut line at the bottom. One cut and the kid has a square.
  const side = pageW;
  const cx = side / 2;
  const cy = side / 2;

  // The cut line: the square's bottom edge, full width.
  doc.setDrawColor(26, 28, 32);
  doc.setLineWidth(1.2);
  doc.line(0, side, pageW, side);

  // Fold guides: full vertical + horizontal, plus the one slant that
  // matters (center to top-right corner, fold 3).
  doc.setLineWidth(0.9);
  doc.setDrawColor(110);
  doc.setLineDashPattern([5, 4], 0);
  doc.line(cx, 6, cx, side - 6);
  doc.line(6, cy, side - 6, cy);
  doc.line(cx, cy, side - 6, 6);
  doc.setLineDashPattern([], 0);

  // The pattern, printed in the octant that ends up on top. Cut zones
  // are outlined and hatched instead of solid-filled to save ink.
  const scale = side / 2 / R;
  doc.setDrawColor(26, 28, 32);
  for (const shape of shapes) {
    if (shape.length < 3) continue;
    const pts = shape.map((p) => ({ x: cx + p.x * scale, y: cy + p.y * scale }));
    const deltas: number[][] = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push([pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y]);
    }
    // Outline: the actual cutting guide.
    doc.setLineWidth(1.1);
    doc.lines(deltas, pts[0].x, pts[0].y, [1, 1], 'S', true);
    // Diagonal hatching, clipped to the shape.
    doc.saveGraphicsState();
    doc.lines(deltas, pts[0].x, pts[0].y, [1, 1], null, true);
    doc.clip();
    doc.discardPath();
    doc.setLineWidth(0.6);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // 45° lines y = x + c, ~4.5pt apart.
    const step = 4.5 * Math.SQRT2;
    for (let c = minY - maxX; c <= maxY - minX; c += step) {
      doc.line(minX, minX + c, maxX, maxX + c);
    }
    doc.restoreGraphicsState();
  }

  // Scissors mark on the cut line (the square's bottom edge).
  drawScissors(doc, 24, side);

  // Bottom strip: plain text only — no boxes, no fills, no logo block.
  // Text keeps a modest margin so home printers don't clip it.
  const textX = 22;
  let y = side + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text('SNOWCUT', textX, y);
  y += 18;
  doc.setFontSize(10.5);
  const steps = pdfSteps();
  for (let i = 0; i < steps.length; i++) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}.`, textX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(steps[i], textX + 16, y);
    y += 17;
  }

  doc.save('snowcut-snowflake.pdf');
}

// A minimal stroke-only scissors sitting on the cut line.
function drawScissors(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(26, 28, 32);
  doc.setLineWidth(1);
  doc.circle(x - 5, y + 4, 2.4, 'S');
  doc.circle(x - 5, y - 4, 2.4, 'S');
  doc.line(x - 3, y + 3, x + 9, y - 4);
  doc.line(x - 3, y - 3, x + 9, y + 4);
}
