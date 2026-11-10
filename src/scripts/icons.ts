// Desktop icons you can move.
//
// On a wide screen an icon is dragged anywhere on the wallpaper and stays
// where it is dropped. On a phone the icons are a home screen: press and
// hold one and they all start to wiggle, then drag to reorder them, as on
// an iPhone. Both arrangements are remembered in this browser.
//
// An icon never leaves its list in the page. A free position is only a
// `translate` away from the grid cell it already has, so the layout, the
// tab order and the no-JavaScript page are untouched.

type Side = 'l' | 'r';

/** Where a freely placed icon sits: its distance from one side, and from the top. */
interface Spot {
  side: Side;
  x: number;
  y: number;
}

interface Saved {
  /** Icon ids per list, in order. */
  order?: Record<string, string[]>;
  spots?: Record<string, Spot>;
}

interface Press {
  pointerId: number;
  li: HTMLElement;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  timer: number;
}

interface Held {
  li: HTMLElement;
  grabX: number;
  grabY: number;
  /** Free placement (wide screens) rather than reordering (phones). */
  free: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const KEY = 'lcc:icons:v1';
const HOLD_MS = 450;
const DRAG_SLOP = 6;
const HOLD_SLOP = 10;
const GRID = 4; // one wallpaper pixel

function load(): Saved {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Saved) : {};
  } catch {
    return {};
  }
}

export function initIcons(phone: MediaQueryList): { tidy: () => void } {
  const root = document.documentElement;
  const lists = [...document.querySelectorAll<HTMLElement>('[data-icons]')];
  const icons = lists.flatMap((ul) => [...ul.querySelectorAll<HTMLElement>(':scope > [data-icon]')]);
  const byId = new Map(icons.map((li) => [li.dataset.icon ?? '', li]));
  const original = lists.map((ul) => [...ul.children]);
  const doneButton = document.querySelector<HTMLButtonElement>('[data-icons-done]');
  const layer = document.querySelector<HTMLElement>('[data-windows]');

  let saved = load();
  let arranging = false;
  let press: Press | null = null;
  let held: Held | null = null;
  let swallowUntil = 0;

  function save(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // Private windows and blocked storage: the arrangement lasts for this visit.
    }
  }

  // ---------- geometry -----------------------------------------------------

  /** An icon's own grid cell, wherever it is currently drawn. */
  function slot(li: HTMLElement): Box {
    const list = (li.parentElement as HTMLElement).getBoundingClientRect();
    return { x: list.left + li.offsetLeft, y: list.top + li.offsetTop, w: li.offsetWidth, h: li.offsetHeight };
  }

  const clampX = (x: number, w: number) => Math.min(Math.max(x, 0), Math.max(0, window.innerWidth - w));
  const clampY = (y: number, h: number) => {
    const top = layer?.getBoundingClientRect().top ?? 0;
    return Math.min(Math.max(y, top), Math.max(top, window.innerHeight - h));
  };
  const snap = (n: number) => Math.round(n / GRID) * GRID;

  // ---------- applying what was saved --------------------------------------

  function restoreOriginalOrder(): void {
    lists.forEach((ul, i) => ul.append(...original[i]));
  }

  function applyOrder(): void {
    lists.forEach((ul) => {
      (saved.order?.[ul.dataset.icons ?? ''] ?? []).forEach((id) => {
        const li = byId.get(id);
        if (li) ul.append(li);
      });
    });
    // A list with nothing in it could never be dropped into again.
    if (lists.some((ul) => ul.children.length === 0)) restoreOriginalOrder();
  }

  /** Put freely placed icons where they were left; on phones nothing is free. */
  function arrange(): void {
    icons.forEach((li) => {
      if (li === held?.li) return;
      const spot = phone.matches ? undefined : saved.spots?.[li.dataset.icon ?? ''];
      if (!spot) {
        li.style.translate = '';
        return;
      }
      const cell = slot(li);
      const left = clampX(spot.side === 'l' ? spot.x : window.innerWidth - spot.x - cell.w, cell.w);
      const top = clampY(spot.y, cell.h);
      li.style.translate = `${Math.round(left - cell.x)}px ${Math.round(top - cell.y)}px`;
    });
  }

  /** Change the layout, then slide every other icon from where it was drawn. */
  function flip(mutate: () => void, skip?: HTMLElement): void {
    const moving = icons.filter((li) => li !== skip);
    const before = new Map(moving.map((li) => [li, li.getBoundingClientRect()]));
    mutate();
    moving.forEach((li) => {
      li.style.transition = 'none';
      li.style.translate = '';
    });
    moving.forEach((li) => {
      const was = before.get(li)!;
      const now = li.getBoundingClientRect();
      const dx = Math.round(was.left - now.left);
      const dy = Math.round(was.top - now.top);
      if (dx || dy) li.style.translate = `${dx}px ${dy}px`;
    });
    void root.offsetWidth; // commit the starting positions before letting go
    moving.forEach((li) => {
      li.style.transition = '';
      li.style.translate = '';
    });
  }

  // ---------- wiggle mode --------------------------------------------------

  function setArranging(on: boolean): void {
    if (arranging === on) return;
    arranging = on;
    root.classList.toggle('is-arranging', on);
    if (doneButton) doneButton.hidden = !on;
  }

  /** Move the held icon into the cell its centre is over. */
  function reorder(li: HTMLElement, cx: number, cy: number): boolean {
    const inside = (b: Box) => cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h;
    if (inside(slot(li))) return false;
    const from = li.parentElement as HTMLElement;

    for (const ul of lists) {
      const r = ul.getBoundingClientRect();
      if (!inside({ x: r.left, y: r.top, w: r.width, h: r.height })) continue;
      if (ul !== from && from.children.length === 1) return false;

      const target = ([...ul.children] as HTMLElement[]).find((el) => el !== li && inside(slot(el)));
      let next: Element | null = null; // no icon under it: the empty end of the last row
      if (target) {
        const cell = slot(target);
        const goesAfter =
          ul === from
            ? Boolean(li.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)
            : cx > cell.x + cell.w / 2;
        next = goesAfter ? target.nextElementSibling : target;
      }
      if (next === li || (next === null && ul.lastElementChild === li)) return false;
      flip(() => ul.insertBefore(li, next), li);
      return true;
    }
    return false;
  }

  // ---------- picking up, moving, dropping --------------------------------

  function lift(x: number, y: number): void {
    if (!press) return;
    const { li, pointerId } = press;
    const r = li.getBoundingClientRect();
    held = { li, grabX: x - r.left, grabY: y - r.top, free: !phone.matches };
    li.classList.add('is-held');
    document.body.classList.add('is-dragging');
    // Capture on something that never moves: the icon itself may be
    // re-inserted while it is dragged, which would drop the capture.
    try {
      document.body.setPointerCapture(pointerId);
    } catch {
      // The pointer is already gone; the window listeners still end the drag.
    }
  }

  function follow(x: number, y: number): void {
    if (!held) return;
    const { li, grabX, grabY, free } = held;
    let cell = slot(li);
    let left = x - grabX;
    let top = y - grabY;
    if (free) {
      left = clampX(left, cell.w);
      top = clampY(top, cell.h);
    } else if (reorder(li, left + cell.w / 2, top + cell.h / 2)) {
      cell = slot(li);
    }
    li.style.translate = `${Math.round(left - cell.x)}px ${Math.round(top - cell.y)}px`;
  }

  function drop(): void {
    if (!held) return;
    const { li, free } = held;
    held = null;
    li.classList.remove('is-held');
    document.body.classList.remove('is-dragging');
    swallowUntil = performance.now() + 400;

    if (free) {
      const r = li.getBoundingClientRect();
      const left = clampX(snap(r.left), r.width);
      const top = clampY(snap(r.top), r.height);
      const side: Side = left + r.width / 2 < window.innerWidth / 2 ? 'l' : 'r';
      saved.spots = {
        ...saved.spots,
        [li.dataset.icon ?? '']: { side, x: side === 'l' ? left : window.innerWidth - left - r.width, y: top },
      };
      arrange();
    } else {
      li.style.translate = ''; // glides into its cell
      saved.order = Object.fromEntries(
        lists.map((ul) => [ul.dataset.icons ?? '', ([...ul.children] as HTMLElement[]).map((el) => el.dataset.icon ?? '')]),
      );
    }
    save();
  }

  function onMove(e: PointerEvent): void {
    if (!press || e.pointerId !== press.pointerId) return;
    press.lastX = e.clientX;
    press.lastY = e.clientY;
    if (held) {
      follow(e.clientX, e.clientY);
      return;
    }
    const travelled = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (phone.matches && !arranging) {
      // Still waiting for the hold: moving away means it was never one.
      if (travelled > HOLD_SLOP) window.clearTimeout(press.timer);
      return;
    }
    if (travelled > DRAG_SLOP) {
      lift(press.x, press.y);
      follow(e.clientX, e.clientY);
    }
  }

  function onUp(e: PointerEvent): void {
    if (!press || e.pointerId !== press.pointerId) return;
    window.clearTimeout(press.timer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    drop();
    press = null;
  }

  lists.forEach((ul) => {
    ul.addEventListener('pointerdown', (e) => {
      const li = (e.target as HTMLElement).closest<HTMLElement>('[data-icon]');
      if (!li || press || e.button !== 0 || !e.isPrimary) return;
      const started: Press = { pointerId: e.pointerId, li, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, timer: 0 };
      press = started;
      if (phone.matches && !arranging) {
        started.timer = window.setTimeout(() => {
          if (press !== started) return;
          setArranging(true);
          navigator.vibrate?.(12);
          lift(started.lastX, started.lastY);
          follow(started.lastX, started.lastY);
        }, HOLD_MS);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });

    // The browser's own link dragging and long-press menu would fight ours.
    ul.addEventListener('dragstart', (e) => e.preventDefault());
    ul.addEventListener('contextmenu', (e) => {
      if (phone.matches || arranging) e.preventDefault();
    });
  });

  // A drag must not also open the icon, and wiggling icons open nothing.
  window.addEventListener(
    'click',
    (e) => {
      const onIcon = e.target instanceof Element && e.target.closest('[data-icon]');
      if ((arranging && onIcon) || performance.now() < swallowUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  // ---------- leaving wiggle mode -----------------------------------------

  doneButton?.addEventListener('click', () => setArranging(false));

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!arranging || !(e.target instanceof Element)) return;
      if (!e.target.closest('[data-icon], [data-icons-done]')) setArranging(false);
    },
    true,
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setArranging(false);
  });

  phone.addEventListener('change', () => {
    setArranging(false);
    arrange();
  });
  window.addEventListener('resize', arrange);
  window.addEventListener('load', arrange);

  // ---------- boot ---------------------------------------------------------

  applyOrder();
  arrange();

  return {
    /** Put every icon back where it started. */
    tidy(): void {
      saved = {};
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing was stored, so there is nothing to forget.
      }
      root.classList.add('is-tidying');
      flip(restoreOriginalOrder);
      window.setTimeout(() => root.classList.remove('is-tidying'), 300);
    },
  };
}
