// Desktop icons you can move and select.
//
// On a wide screen an icon is dragged across the wallpaper and settles into
// the nearest free cell of an invisible grid, the same grid the icons start
// out on. Several icons can be selected (a drag across the wallpaper, or a
// click with Shift, Ctrl or Cmd held) and then move together. On a phone
// the icons are a home screen: press and hold one and they all start to
// wiggle, then drag to reorder them, as on an iPhone. Both arrangements are
// remembered in this browser.
//
// An icon never leaves its list in the page. A moved icon is only a
// `translate` away from the place the layout already gave it, so the
// layout, the tab order and the no-JavaScript page are untouched.

type Side = 'l' | 'r';

/**
 * A cell of the hidden grid. Columns are counted inwards from one side of
 * the screen, so icons parked on the right stay on the right when the
 * window is resized.
 */
interface Spot {
  side: Side;
  col: number;
  row: number;
}

/** The hidden grid as it fits the window right now. */
interface Grid {
  w: number;
  h: number;
  top: number;
  padLeft: number;
  padRight: number;
  rows: number;
  cols: Record<Side, number>;
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
  /** Placed on the grid (wide screens) rather than reordered (phones). */
  free: boolean;
  /** Every icon being carried, with where the pointer holds it. */
  group: { li: HTMLElement; grabX: number; grabY: number }[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Icons {
  /** Put every icon back where it started. */
  tidy(): void;
  /** Send moved icons back to their own cells. */
  putBack(ids: string[]): void;
  isMoved(id: string): boolean;
  selected(): string[];
  select(ids: string[]): void;
  selectAll(): void;
  /** Select `keep` plus every icon touching a rectangle on the screen. */
  selectWithin(box: Box, keep: string[]): void;
  /** Start the phone's wiggle mode. */
  arrange(): void;
}

const KEY = 'lcc:icons:v1';
const HOLD_MS = 450;
const DRAG_SLOP = 6;
const HOLD_SLOP = 10;

function load(): Saved {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const saved = parsed as Saved;
    // Keep only spots that name a grid cell (an earlier version stored pixels).
    saved.spots = Object.fromEntries(
      Object.entries(saved.spots ?? {}).filter(([, s]) => Number.isInteger(s?.col) && Number.isInteger(s?.row)),
    );
    return saved;
  } catch {
    return {};
  }
}

const key = (cell: Spot) => `${cell.side}:${cell.col}:${cell.row}`;
const idOf = (li: HTMLElement) => li.dataset.icon ?? '';

export function initIcons(phone: MediaQueryList): Icons {
  const root = document.documentElement;
  const lists = [...document.querySelectorAll<HTMLElement>('[data-icons]')];
  const icons = lists.flatMap((ul) => [...ul.querySelectorAll<HTMLElement>(':scope > [data-icon]')]);
  const byId = new Map(icons.map((li) => [idOf(li), li]));
  const original = lists.map((ul) => [...ul.children]);
  const doneButton = document.querySelector<HTMLButtonElement>('[data-icons-done]');
  const layer = document.querySelector<HTMLElement>('[data-windows]');

  let saved = load();
  let arranging = false;
  let press: Press | null = null;
  let held: Held | null = null;
  let swallowUntil = 0;
  let settleTimer = 0;
  const selection = new Set<HTMLElement>();

  function save(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // Private windows and blocked storage: the arrangement lasts for this visit.
    }
  }

  // ---------- geometry -----------------------------------------------------

  /** An icon's own place in the layout, wherever it is currently drawn. */
  function slot(li: HTMLElement): Box {
    const list = (li.parentElement as HTMLElement).getBoundingClientRect();
    return { x: list.left + li.offsetLeft, y: list.top + li.offsetTop, w: li.offsetWidth, h: li.offsetHeight };
  }

  const clampX = (x: number, w: number) => Math.min(Math.max(x, 0), Math.max(0, window.innerWidth - w));
  const clampY = (y: number, h: number) => {
    const top = layer?.getBoundingClientRect().top ?? 0;
    return Math.min(Math.max(y, top), Math.max(top, window.innerHeight - h));
  };

  // ---------- the hidden grid ----------------------------------------------

  /**
   * Cells are the size of an icon and line up with where the two lists
   * start, so an untouched icon already sits in a cell. The columns are
   * split between the two sides and never overlap in the middle.
   */
  function grid(): Grid {
    const first = lists[0].getBoundingClientRect();
    const last = lists[lists.length - 1].getBoundingClientRect();
    const w = icons[0].offsetWidth;
    const h = icons[0].offsetHeight;
    const padLeft = first.left;
    const padRight = window.innerWidth - last.right;
    const total = Math.max(2, Math.floor((window.innerWidth - padLeft - padRight) / w));
    const left = Math.ceil(total / 2);
    return {
      w,
      h,
      top: first.top,
      padLeft,
      padRight,
      rows: Math.max(1, Math.floor(first.height / h)),
      cols: { l: left, r: total - left },
    };
  }

  function cellBox(cell: Spot, g: Grid): Box {
    const x = cell.side === 'l' ? g.padLeft + cell.col * g.w : window.innerWidth - g.padRight - (cell.col + 1) * g.w;
    return { x, y: g.top + cell.row * g.h, w: g.w, h: g.h };
  }

  /** The free cell closest to a point (the top-left corner of an icon). */
  function nearestFree(x: number, y: number, g: Grid, taken: Set<string>): Spot {
    let best: Spot = { side: 'l', col: 0, row: 0 };
    let bestDistance = Infinity;
    (['l', 'r'] as const).forEach((side) => {
      for (let col = 0; col < g.cols[side]; col++) {
        for (let row = 0; row < g.rows; row++) {
          const cell = { side, col, row };
          if (taken.has(key(cell))) continue;
          const box = cellBox(cell, g);
          const distance = Math.hypot(box.x - x, box.y - y);
          if (distance < bestDistance) {
            best = cell;
            bestDistance = distance;
          }
        }
      }
    });
    return best;
  }

  /** The cell an icon has from the layout alone. */
  function homeCell(li: HTMLElement, g: Grid): Spot {
    const cell = slot(li);
    return nearestFree(cell.x, cell.y, g, new Set());
  }

  /** Let moved icons glide, in steps, to where `arrange` puts them. */
  function settle(): void {
    root.classList.add('is-settling');
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => root.classList.remove('is-settling'), 300);
  }

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

  /** Put moved icons in their grid cells; on phones nothing is moved. */
  function arrange(): void {
    const carried = new Set(held?.group.map((member) => member.li));
    const resting = icons.filter((li) => !carried.has(li));
    const spotOf = (li: HTMLElement) => (phone.matches ? undefined : saved.spots?.[idOf(li)]);
    const moved = resting.filter(spotOf);
    const taken = new Set<string>();

    // Icons nobody moved keep the cell the layout gives them.
    const g = phone.matches ? null : grid();
    resting.forEach((li) => {
      if (spotOf(li)) return;
      li.style.translate = '';
      if (g) taken.add(key(homeCell(li, g)));
    });
    if (!g) return;

    // A moved icon gets its saved cell, or the nearest free one if the
    // window is now too small for it or the cell has been filled.
    moved.forEach((li) => {
      const want = cellBox(spotOf(li)!, g);
      const cell = nearestFree(want.x, want.y, g, taken);
      taken.add(key(cell));
      const box = cellBox(cell, g);
      const from = slot(li);
      li.style.translate = `${Math.round(box.x - from.x)}px ${Math.round(box.y - from.y)}px`;
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

  // ---------- selection ----------------------------------------------------

  function select(next: Iterable<HTMLElement>): void {
    const wanted = new Set(next);
    icons.forEach((li) => {
      const on = wanted.has(li);
      li.classList.toggle('is-selected', on);
      if (on) selection.add(li);
      else selection.delete(li);
    });
  }

  // ---------- wiggle mode --------------------------------------------------

  function setArranging(on: boolean): void {
    if (arranging === on) return;
    arranging = on;
    if (on) select([]);
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
    const free = !phone.matches;
    // Dragging one of several selected icons carries them all; dragging
    // any other icon carries just that one.
    if (!free || !selection.has(li)) select([]);
    const carried = free && selection.size > 1 ? [...selection] : [li];
    held = {
      li,
      free,
      group: carried.map((member) => {
        const r = member.getBoundingClientRect();
        member.classList.add('is-held');
        return { li: member, grabX: x - r.left, grabY: y - r.top };
      }),
    };
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
    held.group.forEach(({ li, grabX, grabY }) => {
      let cell = slot(li);
      let left = x - grabX;
      let top = y - grabY;
      if (held!.free) {
        left = clampX(left, cell.w);
        top = clampY(top, cell.h);
      } else if (reorder(li, left + cell.w / 2, top + cell.h / 2)) {
        cell = slot(li);
      }
      li.style.translate = `${Math.round(left - cell.x)}px ${Math.round(top - cell.y)}px`;
    });
  }

  function drop(): void {
    if (!held) return;
    const { free, group } = held;
    const carried = new Set(group.map((member) => member.li));
    held = null;
    carried.forEach((li) => li.classList.remove('is-held'));
    document.body.classList.remove('is-dragging');
    swallowUntil = performance.now() + 300;

    if (free) {
      // Each one settles into the nearest cell no other icon is using.
      const g = grid();
      const taken = new Set(
        icons
          .filter((other) => !carried.has(other))
          .map((other) => {
            const r = other.getBoundingClientRect();
            return key(nearestFree(r.left, r.top, g, new Set()));
          }),
      );
      const spots = { ...saved.spots };
      carried.forEach((li) => {
        const dropped = li.getBoundingClientRect();
        const cell = nearestFree(dropped.left, dropped.top, g, taken);
        taken.add(key(cell));
        // Back where the layout would put it anyway: nothing to remember.
        if (key(cell) === key(homeCell(li, g))) delete spots[idOf(li)];
        else spots[idOf(li)] = cell;
      });
      saved.spots = spots;
      settle();
      arrange();
    } else {
      carried.forEach((li) => (li.style.translate = '')); // glides into its cell
      saved.order = Object.fromEntries(lists.map((ul) => [ul.dataset.icons ?? '', ([...ul.children] as HTMLElement[]).map(idOf)]));
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

    // The browser's own link dragging would fight ours.
    ul.addEventListener('dragstart', (e) => e.preventDefault());
  });

  // A drag must not also open the icon, wiggling icons open nothing, and a
  // click with a modifier key selects instead of opening.
  window.addEventListener(
    'click',
    (e) => {
      const li = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-icon]') : null;
      const swallow = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if ((arranging && li) || performance.now() < swallowUntil) return swallow();
      if (!li) return;
      if (!phone.matches && (e.shiftKey || e.metaKey || e.ctrlKey)) {
        const next = new Set(selection);
        if (next.has(li)) next.delete(li);
        else next.add(li);
        select(next);
        return swallow();
      }
      select([]); // an ordinary click opens the icon and lets go of the rest
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
    if (e.key === 'Escape') {
      setArranging(false);
      select([]);
    }
  });

  phone.addEventListener('change', () => {
    setArranging(false);
    select([]);
    arrange();
  });
  window.addEventListener('resize', arrange);
  window.addEventListener('load', arrange);

  // ---------- boot ---------------------------------------------------------

  applyOrder();
  arrange();

  return {
    tidy(): void {
      saved = {};
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing was stored, so there is nothing to forget.
      }
      settle();
      flip(restoreOriginalOrder);
    },

    putBack(ids: string[]): void {
      const spots = { ...saved.spots };
      ids.forEach((id) => delete spots[id]);
      saved.spots = spots;
      settle();
      arrange();
      save();
    },

    isMoved: (id) => Boolean(saved.spots?.[id]),
    selected: () => [...selection].map(idOf),
    select: (ids) => select(ids.map((id) => byId.get(id)).filter((li): li is HTMLElement => Boolean(li))),
    selectAll: () => select(icons),

    selectWithin(box, keep): void {
      const touching = icons.filter((li) => {
        const r = li.getBoundingClientRect();
        return r.left < box.x + box.w && r.right > box.x && r.top < box.y + box.h && r.bottom > box.y;
      });
      select([...touching, ...keep.map((id) => byId.get(id)).filter((li): li is HTMLElement => Boolean(li))]);
    },

    arrange: () => setArranging(true),
  };
}
