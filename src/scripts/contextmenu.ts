// The menu that opens on a secondary click (or a long press on a phone).
// One element, filled in each time with whatever fits the thing clicked.

export interface MenuItem {
  label: string;
  run: () => void;
  /** Shows a tick: the current choice in a group. */
  checked?: boolean;
  disabled?: boolean;
}

export type MenuEntry = MenuItem | 'separator' | { heading: string };

export interface ContextMenu {
  show(x: number, y: number, entries: MenuEntry[], returnFocus?: HTMLElement | null): void;
  hide(): void;
  isOpen(): boolean;
}

const EDGE = 8;

export function initContextMenu(): ContextMenu {
  const menu = document.createElement('div');
  menu.className = 'menu-panel ctx';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Desktop menu');
  menu.tabIndex = -1;
  menu.hidden = true;
  document.body.append(menu);

  let giveBack: HTMLElement | null = null;

  const rows = () => [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];

  function hide(refocus = false): void {
    if (menu.hidden) return;
    menu.hidden = true;
    menu.replaceChildren();
    if (refocus && giveBack?.isConnected) giveBack.focus({ preventScroll: true });
    giveBack = null;
  }

  function show(x: number, y: number, entries: MenuEntry[], returnFocus: HTMLElement | null = null): void {
    giveBack = returnFocus;
    menu.replaceChildren(
      ...entries.map((entry) => {
        if (entry === 'separator') {
          const hr = document.createElement('hr');
          hr.className = 'menu-sep';
          return hr;
        }
        if ('heading' in entry) {
          const label = document.createElement('span');
          label.className = 'menu-label';
          label.textContent = entry.heading;
          return label;
        }
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'menu-row';
        row.disabled = Boolean(entry.disabled);
        if (entry.checked === undefined) {
          row.setAttribute('role', 'menuitem');
        } else {
          row.setAttribute('role', 'menuitemradio');
          row.setAttribute('aria-checked', String(entry.checked));
        }
        const tick = document.createElement('span');
        tick.className = 'ctx-tick';
        tick.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = entry.label;
        row.append(tick, label);
        row.addEventListener('click', () => {
          hide();
          entry.run();
        });
        return row;
      }),
    );

    // Open at the pointer, pulled back inside the window if it would spill.
    menu.hidden = false;
    menu.style.left = '0px';
    menu.style.top = '0px';
    const { width, height } = menu.getBoundingClientRect();
    const left = Math.max(EDGE, Math.min(x, window.innerWidth - width - EDGE));
    const top = Math.max(EDGE, Math.min(y, window.innerHeight - height - EDGE));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.focus({ preventScroll: true });
  }

  menu.addEventListener('keydown', (e) => {
    const list = rows();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      list[(at + step + list.length) % list.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      list[e.key === 'Home' ? 0 : list.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      hide(true);
    } else if (e.key === 'Tab') {
      hide(true);
    }
  });

  // The menu's own secondary click does nothing, rather than the browser's menu.
  menu.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!menu.hidden && !menu.contains(e.target as Node)) hide();
    },
    true,
  );
  window.addEventListener('resize', () => hide());
  window.addEventListener('blur', () => hide());

  return { show, hide: () => hide(), isOpen: () => !menu.hidden };
}
