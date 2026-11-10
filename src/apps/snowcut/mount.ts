// Snowcut, running inside a Little Cow Club window.
// Ported from the standalone Snowcut app: same behaviour,
// but every lookup is scoped to the window's root element instead of the
// document, so the app never touches the page around it.

import {
  type Polygon,
  type Point,
  D4,
  clipToWedge,
  pointInPolygon,
  polygonArea,
  polygonToPath,
  simplify,
  transformPolygon,
} from './geometry';
import { randomPattern } from './random';
import { downloadPdf, type Paper } from './pdf';
import { type Lang, type TextKey, getLang, setLang, t } from './i18n';

type Tool = 'draw' | 'erase';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function mountSnowcut(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  root.dataset.mounted = 'true';

  let shapes: Polygon[] = [];
  const history: Polygon[][] = [];
  let tool: Tool = 'draw';
  let revealed = false;
  let stroke: Point[] = [];
  let drawing = false;

  const $ = <T extends Element = HTMLElement>(name: string): T => {
    const el = root.querySelector<T>(`[data-sc="${name}"]`);
    if (!el) throw new Error(`Snowcut: missing element "${name}"`);
    return el;
  };

  const editor = $<SVGSVGElement>('editor');
  const shapesGroup = $<SVGGElement>('shapes');
  const strokePreview = $<SVGPathElement>('stroke-preview');
  const holesGroup = $<SVGGElement>('holes');
  const previewSvg = $<SVGSVGElement>('preview-svg');
  const previewHidden = $('preview-hidden');
  const previewHint = $('preview-hint');
  const modal = $<HTMLDialogElement>('modal');
  const printButton = $<HTMLButtonElement>('print');

  // ---------- rendering ----------

  function render(): void {
    shapesGroup.replaceChildren(
      ...shapes.map((shape) => {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', polygonToPath(shape));
        path.setAttribute('class', 'sc-shape');
        return path;
      }),
    );
    holesGroup.replaceChildren(
      ...shapes.flatMap((shape) =>
        D4.map((transform) => {
          const path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', polygonToPath(transformPolygon(shape, transform)));
          return path;
        }),
      ),
    );
  }

  function setRevealed(value: boolean): void {
    revealed = value;
    previewSvg.classList.toggle('is-hidden', !revealed);
    previewHidden.classList.toggle('is-hidden', revealed);
    $('show').classList.toggle('active', revealed);
    $('hide').classList.toggle('active', !revealed);
    $('show').setAttribute('aria-pressed', String(revealed));
    $('hide').setAttribute('aria-pressed', String(!revealed));
    previewHint.textContent = revealed ? t('hintRevealed') : t('hintHidden');
  }

  // ---------- language ----------

  function applyLang(lang: Lang): void {
    setLang(lang);
    root.lang = lang;
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n as TextKey);
    });
    root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml as TextKey);
    });
    root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
      const text = t(el.dataset.i18nTitle as TextKey);
      el.title = text;
      el.setAttribute('aria-label', text);
    });
    $('lang-en').classList.toggle('active', lang === 'en');
    $('lang-es').classList.toggle('active', lang === 'es');
    $('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    $('lang-es').setAttribute('aria-pressed', String(lang === 'es'));
    previewHint.textContent = revealed ? t('hintRevealed') : t('hintHidden');
  }

  $('lang-en').addEventListener('click', () => applyLang('en'));
  $('lang-es').addEventListener('click', () => applyLang('es'));

  // ---------- state ----------

  function pushHistory(): void {
    history.push(shapes.map((s) => s.map((p) => ({ ...p }))));
    if (history.length > 60) history.shift();
  }

  function setShapes(next: Polygon[]): void {
    pushHistory();
    shapes = next;
    render();
  }

  // ---------- tools ----------

  function setTool(next: Tool): void {
    tool = next;
    $('tool-draw').classList.toggle('active', tool === 'draw');
    $('tool-erase').classList.toggle('active', tool === 'erase');
    $('tool-draw').setAttribute('aria-pressed', String(tool === 'draw'));
    $('tool-erase').setAttribute('aria-pressed', String(tool === 'erase'));
    editor.classList.toggle('erase-mode', tool === 'erase');
  }

  $('tool-draw').addEventListener('click', () => setTool('draw'));
  $('tool-erase').addEventListener('click', () => setTool('erase'));
  $('tool-undo').addEventListener('click', () => {
    const prev = history.pop();
    if (prev) {
      shapes = prev;
      render();
    }
  });
  $('tool-clear').addEventListener('click', () => {
    if (shapes.length > 0) setShapes([]);
  });
  $('random').addEventListener('click', () => setShapes(randomPattern()));

  // ---------- drawing on the wedge ----------

  function svgPoint(e: PointerEvent): Point {
    const pt = new DOMPoint(e.clientX, e.clientY);
    const ctm = editor.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  editor.addEventListener('pointerdown', (e) => {
    if (tool === 'erase') {
      const p = svgPoint(e);
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (pointInPolygon(p, shapes[i])) {
          setShapes(shapes.filter((_, j) => j !== i));
          return;
        }
      }
      return;
    }
    drawing = true;
    stroke = [svgPoint(e)];
    editor.setPointerCapture(e.pointerId);
  });

  editor.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = svgPoint(e);
    const last = stroke[stroke.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 1.2) {
      stroke.push(p);
      strokePreview.setAttribute('d', polygonToPath(stroke));
    }
  });

  function endStroke(): void {
    if (!drawing) return;
    drawing = false;
    strokePreview.setAttribute('d', '');
    if (stroke.length < 3) return;
    const shape = clipToWedge(simplify(stroke, 1.1));
    if (shape.length >= 3 && Math.abs(polygonArea(shape)) > 12) {
      setShapes([...shapes, shape]);
    }
    stroke = [];
  }

  editor.addEventListener('pointerup', endStroke);
  editor.addEventListener('pointercancel', endStroke);

  // ---------- reveal flow (hidden by default) ----------

  $('show').addEventListener('click', () => {
    if (revealed) return;
    modal.showModal();
  });
  $('hide').addEventListener('click', () => setRevealed(false));
  $('modal-keep').addEventListener('click', () => modal.close());
  $('modal-show').addEventListener('click', () => {
    modal.close();
    setRevealed(true);
  });

  // ---------- print ----------

  printButton.addEventListener('click', async () => {
    const paper = $<HTMLSelectElement>('paper').value as Paper;
    printButton.disabled = true;
    try {
      await downloadPdf(shapes, paper);
    } finally {
      printButton.disabled = false;
    }
  });

  // ---------- boot ----------

  shapes = randomPattern();
  render();
  applyLang(getLang());
  setRevealed(false);
  setTool('draw');
}
