// The bare desktop: what happens when you press on the wallpaper itself.
//
//   a click           the wallpaper reacts (src/scripts/wallpapers.ts)
//   a drag            a selection box that picks up the icons it touches
//   a long press      the desktop menu, for touch screens with no right button

import type { Box, Icons } from './icons';

interface Options {
  phone: MediaQueryList;
  icons: Icons;
  /** True while a press should only dismiss something (an open menu, wiggle mode). */
  busy: () => boolean;
  onClick: (x: number, y: number) => void;
  onHold: (x: number, y: number) => void;
}

const SLOP = 6;
const HOLD_MS = 520;

/** Is this element part of the empty desktop, rather than something on it? */
export function isBackdrop(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target === document.documentElement || target === document.body) return true;
  if (target.closest('[data-cow-walker]')) return false;
  // The icon lists are invisible boxes; only the icons inside them count as icons.
  return Boolean(target.closest('[data-wallpaper-root]')) || target.matches('[data-icons]');
}

export function initBackdrop({ phone, icons, busy, onClick, onHold }: Options): void {
  let press: { id: number; x: number; y: number; mode: 'press' | 'box' | 'done'; timer: number; keep: string[] } | null = null;
  let box: HTMLElement | null = null;

  function drawBox(x: number, y: number): void {
    if (!press || !box) return;
    const area: Box = { x: Math.min(press.x, x), y: Math.min(press.y, y), w: Math.abs(x - press.x), h: Math.abs(y - press.y) };
    Object.assign(box.style, { left: `${area.x}px`, top: `${area.y}px`, width: `${area.w}px`, height: `${area.h}px` });
    icons.selectWithin(area, press.keep);
  }

  function onMove(e: PointerEvent): void {
    if (!press || e.pointerId !== press.id) return;
    if (press.mode === 'press' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) {
      window.clearTimeout(press.timer);
      if (phone.matches) {
        press.mode = 'done'; // phones have no selection box; this was a swipe
        return;
      }
      press.mode = 'box';
      box = document.createElement('div');
      box.className = 'marquee';
      document.body.append(box);
      document.body.classList.add('is-dragging');
      try {
        document.body.setPointerCapture(e.pointerId);
      } catch {
        // The pointer has already gone; the window listeners still finish up.
      }
    }
    if (press.mode === 'box') drawBox(e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent): void {
    if (!press || e.pointerId !== press.id) return;
    window.clearTimeout(press.timer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    const { mode, x, y } = press;
    press = null;
    box?.remove();
    box = null;
    document.body.classList.remove('is-dragging');
    if (mode === 'press' && e.type === 'pointerup') {
      icons.select([]);
      onClick(x, y);
    }
  }

  // On the window, so this runs before the listeners that close menus on
  // any press: `busy` still sees what was open when the press began.
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (press || e.button !== 0 || !e.isPrimary || !isBackdrop(e.target) || busy()) return;
      const started = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        mode: 'press' as const,
        timer: 0,
        // Holding Shift, Ctrl or Cmd adds to what is already selected.
        keep: e.shiftKey || e.metaKey || e.ctrlKey ? icons.selected() : [],
      };
      press = started;
      if (e.pointerType !== 'mouse') {
        started.timer = window.setTimeout(() => {
          if (press !== started || press.mode !== 'press') return;
          press.mode = 'done';
          onHold(started.x, started.y);
        }, HOLD_MS);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    true,
  );
}
