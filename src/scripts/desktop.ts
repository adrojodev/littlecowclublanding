// The Little Cow Club desktop: a small window manager plus the handful of
// behaviours that live on the wallpaper (menus, clock, the cow).
//
// Windows are plain <section data-win> elements already in the page. This
// file only decides which are open, where they sit, and which is in front.

import { wallpapers as wallpaperList } from '../data/wallpapers';
import { initBackdrop, isBackdrop } from './backdrop';
import { initContextMenu, type MenuEntry } from './contextmenu';
import { initIcons } from './icons';
import { initWallpapers } from './wallpapers';

interface Win {
  id: string;
  el: HTMLElement;
  placed: boolean;
  /** What had focus when the window was opened, to hand focus back on close. */
  opener: HTMLElement | null;
}

const layer = document.querySelector<HTMLElement>('[data-windows]');
const phone = window.matchMedia('(max-width: 760px)');
const wins = new Map<string, Win>();
const MARGIN = 16;
const CASCADE = 30;
let topZ = 10;
let cascade = 0;

document.querySelectorAll<HTMLElement>('[data-win]').forEach((el) => {
  wins.set(el.id, { id: el.id, el, placed: false, opener: null });
});

// ---------- placing --------------------------------------------------------

function place(win: Win): void {
  if (!layer) return;
  const lw = layer.clientWidth;
  const lh = layer.clientHeight;
  const w = Math.min(Number(win.el.dataset.w) || 720, lw - MARGIN * 2);
  const h = Math.min(Number(win.el.dataset.h) || 560, lh - MARGIN * 2);
  // Centre the first window; step each later one down and to the right.
  const step = (cascade++ % 5) * CASCADE;
  const x = Math.min(Math.max(MARGIN, Math.round((lw - w) / 2) + step), Math.max(MARGIN, lw - w - MARGIN));
  const y = Math.min(Math.max(MARGIN, Math.round((lh - h) / 2.6) + step), Math.max(MARGIN, lh - h - MARGIN));
  Object.assign(win.el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  win.placed = true;
}

/** Keep a window reachable: its title bar can never leave the desktop. */
function clamp(win: Win): void {
  if (!layer) return;
  const el = win.el;
  const maxX = layer.clientWidth - 96;
  const maxY = layer.clientHeight - 40;
  const x = Math.min(Math.max(el.offsetLeft, 96 - el.offsetWidth), maxX);
  const y = Math.min(Math.max(el.offsetTop, 0), maxY);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

// ---------- open / focus / close ------------------------------------------

function isOpen(win: Win): boolean {
  return win.el.classList.contains('is-open');
}

function frontmost(): Win | undefined {
  return [...wins.values()]
    .filter(isOpen)
    .sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
}

function setHash(id: string | null): void {
  // Home is the default view, so it keeps the address clean.
  const url = id && id !== 'home' ? `#${id}` : window.location.pathname + window.location.search;
  window.history.replaceState(null, '', url);
}

function activate(win: Win, moveFocus: boolean): void {
  if (!win.el.classList.contains('is-active')) {
    wins.forEach((other) => other.el.classList.toggle('is-active', other === win));
    win.el.style.zIndex = String(++topZ);
    setHash(win.id);
  }
  if (moveFocus) win.el.focus({ preventScroll: true });
}

function open(id: string, opener: HTMLElement | null = null): void {
  const win = wins.get(id);
  if (!win) return;
  if (!isOpen(win)) {
    if (!win.placed) place(win);
    win.opener = opener;
    win.el.classList.add('is-open', 'is-opening');
    win.el.addEventListener('animationend', () => win.el.classList.remove('is-opening'), { once: true });
    // Fallback for reduced motion, where no animation ever ends.
    window.setTimeout(() => win.el.classList.remove('is-opening'), 400);
    win.el.dispatchEvent(new CustomEvent('win:open'));
  }
  activate(win, true);
}

function close(win: Win): void {
  win.el.classList.remove('is-open', 'is-active', 'is-max');
  const next = frontmost();
  if (next) activate(next, false);
  else setHash(null);
  const target = win.opener && win.opener.isConnected && win.opener.offsetParent !== null ? win.opener : next?.el;
  target?.focus({ preventScroll: true });
  win.opener = null;
}

// ---------- dragging and resizing -----------------------------------------

function track(e: PointerEvent, onMove: (dx: number, dy: number) => void): void {
  const handle = e.currentTarget as HTMLElement;
  const startX = e.clientX;
  const startY = e.clientY;
  handle.setPointerCapture(e.pointerId);
  document.body.classList.add('is-dragging');

  const move = (ev: PointerEvent) => onMove(ev.clientX - startX, ev.clientY - startY);
  const end = () => {
    document.body.classList.remove('is-dragging');
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

wins.forEach((win) => {
  const { el } = win;
  const bar = el.querySelector<HTMLElement>('[data-drag]');
  const grip = el.querySelector<HTMLElement>('[data-resize]');

  // Any press inside a window brings it forward, without stealing focus
  // from whatever was pressed.
  el.addEventListener('pointerdown', () => activate(win, false), true);

  bar?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || phone.matches || el.classList.contains('is-max')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (!layer) return;
    const originX = el.offsetLeft;
    const originY = el.offsetTop;
    const maxX = layer.clientWidth - 96;
    const maxY = layer.clientHeight - 40;
    track(e, (dx, dy) => {
      el.style.left = `${Math.min(Math.max(originX + dx, 96 - el.offsetWidth), maxX)}px`;
      el.style.top = `${Math.min(Math.max(originY + dy, 0), maxY)}px`;
    });
  });

  bar?.addEventListener('dblclick', (e) => {
    if (phone.matches || (e.target as HTMLElement).closest('button')) return;
    el.classList.toggle('is-max');
  });

  grip?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || phone.matches) return;
    e.preventDefault();
    const originW = el.offsetWidth;
    const originH = el.offsetHeight;
    track(e, (dx, dy) => {
      el.style.width = `${Math.max(320, originW + dx)}px`;
      el.style.height = `${Math.max(220, originH + dy)}px`;
    });
  });

  el.querySelector('[data-win-close]')?.addEventListener('click', () => close(win));
  el.querySelector('[data-win-max]')?.addEventListener('click', () => el.classList.toggle('is-max'));
});

window.addEventListener('resize', () => {
  wins.forEach((win) => {
    if (isOpen(win) && !phone.matches) clamp(win);
  });
});

// ---------- menus ----------------------------------------------------------

const menus = [...document.querySelectorAll<HTMLElement>('[data-menu]')].map((root) => ({
  root,
  button: root.querySelector<HTMLButtonElement>('[data-menu-button]')!,
  panel: root.querySelector<HTMLElement>('[data-menu-panel]')!,
}));

function setMenu(target: (typeof menus)[number] | null): void {
  menus.forEach((menu) => {
    const on = menu === target;
    menu.panel.hidden = !on;
    menu.button.setAttribute('aria-expanded', String(on));
  });
}

const openMenu = () => menus.find((menu) => !menu.panel.hidden) ?? null;

menus.forEach((menu) => {
  menu.button.addEventListener('click', () => setMenu(menu.panel.hidden ? menu : null));
  // With one menu open, sliding along the bar switches menus, like a real one.
  menu.button.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && openMenu() && openMenu() !== menu) setMenu(menu);
  });
});

document.addEventListener('pointerdown', (e) => {
  const current = openMenu();
  if (current && !current.root.contains(e.target as Node)) setMenu(null);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const current = openMenu();
  if (!current) return;
  setMenu(null);
  current.button.focus();
});

// ---------- anything that opens a window ----------------------------------

document.addEventListener('click', (e) => {
  const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
  if (!trigger) return;
  const id = trigger.dataset.open ?? '';
  if (!wins.has(id)) return;
  e.preventDefault();
  // A row inside a menu disappears with the menu, so focus returns to its button.
  const menuButton = trigger.closest('[data-menu]')?.querySelector<HTMLElement>('[data-menu-button]');
  setMenu(null);
  open(id, menuButton ?? trigger);
});

window.addEventListener('hashchange', () => {
  setMenu(null);
  open(window.location.hash.slice(1));
});

// ---------- clock ----------------------------------------------------------

const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const format = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const tick = () => {
    const now = new Date();
    clock.textContent = format.format(now);
    clock.setAttribute('datetime', now.toISOString());
  };
  tick();
  window.setInterval(tick, 15_000);
}

// ---------- wallpapers and the cow ----------------------------------------

const wallpapers = initWallpapers();

document.querySelectorAll('[data-moo]').forEach((el) =>
  el.addEventListener('click', () => {
    setMenu(null);
    wallpapers.pet();
  }),
);

// ---------- desktop icons: drag to move, hold to rearrange on phones --------

const icons = initIcons(phone);

document.querySelectorAll('[data-icons-tidy]').forEach((el) =>
  el.addEventListener('click', () => {
    setMenu(null);
    icons.tidy();
  }),
);

// ---------- the bare desktop: click, drag to select, secondary click -------

const root = document.documentElement;
const ctx = initContextMenu();

initBackdrop({
  phone,
  icons,
  busy: () => ctx.isOpen() || openMenu() !== null || root.classList.contains('is-arranging'),
  onClick: (x, y) => wallpapers.poke(x, y),
  onHold: (x, y) => ctx.show(x, y, desktopMenu()),
});

function desktopMenu(): MenuEntry[] {
  return [
    { heading: 'Wallpaper' },
    ...wallpaperList.map((w) => ({ label: w.name, checked: w.id === wallpapers.current(), run: () => wallpapers.set(w.id) })),
    'separator',
    phone.matches ? { label: 'Rearrange icons', run: icons.arrange } : { label: 'Select all icons', run: icons.selectAll },
    { label: 'Tidy icons', run: icons.tidy },
    'separator',
    { label: 'Settings', run: () => open('settings') },
    { label: 'Moo', run: wallpapers.pet },
  ];
}

function iconMenu(ids: string[], opener: HTMLElement | null): MenuEntry[] {
  if (phone.matches) {
    return [
      { label: 'Open', run: () => open(ids[0], opener) },
      { label: 'Rearrange icons', run: icons.arrange },
    ];
  }
  return [
    { label: ids.length > 1 ? `Open ${ids.length} items` : 'Open', run: () => ids.forEach((id) => open(id, opener)) },
    { label: 'Put back', run: () => icons.putBack(ids), disabled: !ids.some(icons.isMoved) },
    'separator',
    { label: 'Select all icons', run: icons.selectAll },
    { label: 'Tidy icons', run: icons.tidy },
  ];
}

function windowMenu(win: Win): MenuEntry[] {
  const size: MenuEntry[] = phone.matches
    ? []
    : [{ label: win.el.classList.contains('is-max') ? 'Restore' : 'Maximize', run: () => win.el.classList.toggle('is-max') }];
  return [...size, { label: 'Close', run: () => close(win) }];
}

document.addEventListener('contextmenu', (e) => {
  if (!(e.target instanceof Element)) return;
  const target = e.target;
  // From the keyboard there is no pointer: open beside the thing itself.
  let { clientX: x, clientY: y } = e;
  if (x === 0 && y === 0) {
    const box = target.getBoundingClientRect();
    x = box.left + Math.min(box.width / 2, 40);
    y = box.top + Math.min(box.height / 2, 40);
  }

  const icon = target.closest<HTMLElement>('[data-icon]');
  if (icon) {
    e.preventDefault();
    // On a touch screen a long press on an icon starts the wiggle instead.
    if ((e as PointerEvent).pointerType === 'touch' || root.classList.contains('is-arranging')) return;
    setMenu(null);
    const id = icon.dataset.icon ?? '';
    if (phone.matches) icons.select([]);
    else if (!icons.selected().includes(id)) icons.select([id]);
    const ids = phone.matches ? [id] : icons.selected();
    ctx.show(x, y, iconMenu(ids, icon.querySelector('a')), icon.querySelector('a'));
    return;
  }

  if (isBackdrop(target) || target.closest('[data-cow-walker]')) {
    e.preventDefault();
    setMenu(null);
    ctx.show(x, y, desktopMenu());
    return;
  }

  const bar = target.closest('.win-bar');
  const win = bar && wins.get(bar.closest<HTMLElement>('[data-win]')?.id ?? '');
  if (win && !target.closest('button')) {
    e.preventDefault();
    ctx.show(x, y, windowMenu(win), win.el);
  }
});

// Ctrl/Cmd+A on the desktop selects every icon; inside a window it is left alone.
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'a' || !(e.metaKey || e.ctrlKey) || e.altKey || phone.matches) return;
  const focused = document.activeElement;
  if (focused instanceof Element && focused.closest('[data-win], input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  icons.selectAll();
});

// ---------- screenshot pagers ---------------------------------------------

document.querySelectorAll<HTMLElement>('[data-shots]').forEach((root) => {
  const trackEl = root.querySelector<HTMLElement>('[data-shots-track]');
  const prev = root.querySelector<HTMLButtonElement>('[data-shots-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-shots-next]');
  const count = root.querySelector<HTMLElement>('[data-shots-count]');
  if (!trackEl || !prev || !next || !count) return;
  const total = trackEl.children.length;

  const index = () => {
    const first = trackEl.children[0] as HTMLElement;
    const second = trackEl.children[1] as HTMLElement | undefined;
    const stride = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    return stride > 0 ? Math.round(trackEl.scrollLeft / stride) : 0;
  };
  const sync = () => {
    const i = Math.min(index(), total - 1);
    count.textContent = `${i + 1} / ${total}`;
    prev.disabled = i === 0;
    next.disabled = i === total - 1;
  };
  const go = (delta: number) => {
    const target = trackEl.children[Math.min(Math.max(index() + delta, 0), total - 1)] as HTMLElement;
    trackEl.scrollTo({ left: target.offsetLeft - (trackEl.children[0] as HTMLElement).offsetLeft, behavior: 'smooth' });
  };

  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  trackEl.addEventListener('scroll', sync, { passive: true });
  sync();
});

// ---------- contact --------------------------------------------------------

document.querySelectorAll<HTMLFormElement>('[data-mail]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(String(data.get('subject') ?? ''));
    const body = encodeURIComponent(String(data.get('body') ?? ''));
    window.location.href = `mailto:${form.dataset.to}?subject=${subject}&body=${body}`;
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = button.dataset.copy ?? label;
    }
    window.setTimeout(() => (button.textContent = label), 1800);
  });
});

// ---------- Snowcut loads the first time its window opens -----------------

const snowWin = document.querySelector<HTMLElement>('[data-snowcut]')?.closest<HTMLElement>('[data-win]');
snowWin?.addEventListener(
  'win:open',
  async () => {
    const root = snowWin.querySelector<HTMLElement>('[data-snowcut]');
    if (!root) return;
    const { mountSnowcut } = await import('../apps/snowcut/mount');
    mountSnowcut(root);
  },
  { once: true },
);

// ---------- boot -----------------------------------------------------------

const requested = window.location.hash.slice(1);
open(wins.has(requested) ? requested : 'home');
