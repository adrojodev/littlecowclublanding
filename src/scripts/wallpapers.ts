// Wallpapers: which scene is showing, what a click on it does, and what
// the cow does in each one.
//
// The scenes and their art are plain markup (Wallpaper.astro) styled by
// <html data-wallpaper>. This file only changes that attribute, remembers
// it, and adds the small things a click leaves behind.

import { wallpapers, isWallpaper, type WallpaperId } from '../data/wallpapers';

const KEY = 'lcc:settings:v1';
const PX = 4; // one wallpaper pixel

interface Settings {
  wallpaper?: string;
  motion?: 'on' | 'off';
}

export interface Wallpapers {
  current(): WallpaperId;
  set(id: WallpaperId): void;
  /** React to a click on the bare wallpaper at this point. */
  poke(x: number, y: number): void;
  /** Pet the cow. */
  pet(): void;
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.random() * (max - min);
const snap = (n: number) => Math.round(n / PX) * PX;

export function initWallpapers(): Wallpapers {
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-wallpaper-root]')!;
  const walker = document.querySelector<HTMLElement>('[data-cow-walker]')!;
  const cow = walker.querySelector<HTMLElement>('.cow')!;
  const bubble = walker.querySelector<HTMLElement>('[data-cow-bubble]')!;
  const layer = document.querySelector<HTMLElement>('[data-windows]');
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const baseTitle = document.title;

  let settings: Settings = {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') settings = parsed as Settings;
  } catch {
    // No storage: the default wallpaper, for this visit.
  }

  function save(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // The choice lasts for this visit.
    }
  }

  const current = (): WallpaperId => (isWallpaper(root.dataset.wallpaper) ? root.dataset.wallpaper : 'pasture');
  const scene = () => stage.querySelector<HTMLElement>(`[data-wp="${current()}"]`)!;
  /** Whether things may move: not when the visitor, or their system, said no. */
  const animated = () => !reduced.matches && root.dataset.motion !== 'off';

  // ---------- small things left on the wallpaper ---------------------------

  function stamp(name: string): HTMLElement {
    const template = stage.querySelector<HTMLTemplateElement>(`template[data-fx="${name}"]`)!;
    return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  }

  function dot(className: string): HTMLElement {
    const el = document.createElement('i');
    el.className = `fx ${className}`;
    return el;
  }

  /** Put an element at a point on the screen, inside one of the scene's layers. */
  function place(el: HTMLElement, parent: HTMLElement, x: number, y: number): void {
    const box = parent.getBoundingClientRect();
    el.style.left = `${snap(x - box.left)}px`;
    el.style.top = `${snap(y - box.top)}px`;
    parent.append(el);
  }

  const fleeting = (el: HTMLElement, ms: number) => window.setTimeout(() => el.remove(), ms);

  /** Keep only the newest few of something, so an eager clicker cannot fill the page. */
  function cap(parent: HTMLElement, selector: string, max: number): void {
    const all = parent.querySelectorAll(selector);
    for (let i = 0; i < all.length - max; i++) all[i].remove();
  }

  function plant(ground: HTMLElement, x: number, y: number): void {
    place(stamp(pick(['flower', 'flowerRed'])), ground, x - 6, y - 20);
    cap(ground, '.fx-flower', 40);
  }

  function puff(x: number, y: number): void {
    if (!animated()) return;
    const el = stamp('puff');
    place(el, scene(), x - 32, y - 8);
    fleeting(el, 5000);
  }

  function star(x: number, y: number): void {
    const stars = scene().querySelector<HTMLElement>('.stars');
    if (!stars) return;
    const el = document.createElement('i');
    el.className = `star is-born${Math.random() > 0.6 ? ' is-big' : ''}`;
    place(el, stars, x, y);
    cap(stars, '.is-born', 60);
  }

  function shootingStar(x: number, y: number): void {
    if (!animated()) return star(x, y);
    const el = dot('fx-shoot');
    place(el, scene(), x, y);
    fleeting(el, 750);
  }

  function firefly(x: number, y: number): void {
    const el = dot('fx-firefly');
    el.style.setProperty('--dx', `${snap(between(-40, 40))}px`);
    el.style.setProperty('--dy', `${snap(between(-36, -8))}px`);
    el.style.animationDelay = `${between(-2, 0).toFixed(2)}s, ${between(-9, 0).toFixed(2)}s`;
    place(el, scene(), x, y - 8);
    cap(scene(), '.fx-firefly', 24);
  }

  function flock(x: number, y: number): void {
    if (!animated()) return;
    const group = dot('fx-flock');
    const birds = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < birds; i++) {
      const bird = stamp('bird');
      // A loose V behind the leader.
      const row = Math.ceil(i / 2);
      bird.style.left = `${-row * 24}px`;
      bird.style.top = `${(i % 2 ? 1 : -1) * row * 12}px`;
      bird.style.animationDelay = `${(-i * 0.11).toFixed(2)}s`;
      group.append(bird);
    }
    place(group, scene(), x, y);
    fleeting(group, 6000);
  }

  function ripple(water: HTMLElement, x: number, y: number): void {
    if (!animated()) return;
    const ring = dot('fx-ripple');
    place(ring, water, x, y);
    fleeting(ring, 800);
    if (Math.random() < 0.4) {
      const fish = stamp('fish');
      place(fish, water, x, y);
      fleeting(fish, 900);
    }
  }

  // ---------- clicking the wallpaper ---------------------------------------

  /** Replay a one-shot class, even if it is already there. */
  function flash(el: HTMLElement, className: string, ms: number): void {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), ms);
  }

  function pokeThing(thing: HTMLElement): void {
    flash(thing, 'is-poked', 420);
    const here = scene();
    switch (thing.dataset.poke) {
      case 'moon': // crescent or full, and the stars notice
        here.classList.toggle('is-full');
        flash(here, 'is-twinkling', 1200);
        break;
      case 'sun': // a little lower each time, then back up
        here.dataset.step = String((Number(here.dataset.step ?? 0) + 1) % 4);
        break;
      case 'ufo':
        flash(thing, 'is-beaming', 1600);
        break;
      case 'planet': {
        const box = thing.getBoundingClientRect();
        for (let i = 0; i < 3; i++) star(between(box.left - 30, box.right + 30), between(box.top - 30, box.bottom + 30));
        break;
      }
    }
  }

  function poke(x: number, y: number): void {
    const hit = document.elementsFromPoint(x, y).find((el) => stage.contains(el));
    if (!hit) return;
    const thing = hit.closest<HTMLElement>('[data-poke]');
    if (thing) return pokeThing(thing);

    const zoneEl = hit.closest<HTMLElement>('[data-zone]');
    const zone = zoneEl?.dataset.zone ?? 'sky';
    switch (current()) {
      case 'pasture':
        if (zoneEl && zone === 'ground') plant(zoneEl, x, y);
        else puff(x, y);
        break;
      case 'night':
        if (zone === 'ground') firefly(x, y);
        else shootingStar(x, y);
        break;
      case 'sunset':
        flock(x, y);
        break;
      case 'river':
        if (zoneEl && zone === 'water') ripple(zoneEl, x, y);
        else if (zoneEl && zone === 'ground') plant(zoneEl, x, y);
        else puff(x, y);
        break;
      case 'space':
        star(x, y);
        break;
    }
  }

  // ---------- the cow ------------------------------------------------------

  let moos = 0;
  let sayTimer = 0;
  const lines = { sunset: 0, river: 0, night: 0, space: 0 };

  function say(text: string, ms = 1600): void {
    bubble.textContent = text;
    bubble.hidden = false;
    walker.classList.add('is-mooing');
    window.clearTimeout(sayTimer);
    sayTimer = window.setTimeout(hush, ms);
  }

  function hush(): void {
    window.clearTimeout(sayTimer);
    bubble.hidden = true;
    walker.classList.remove('is-mooing', 'is-awake', 'is-spinning');
  }

  function pet(): void {
    moos += 1;
    document.title = `${baseTitle}${'o'.repeat(Math.min(moos, 40))}`;
    const next = (key: keyof typeof lines, options: string[]) => options[lines[key]++ % options.length];

    switch (current()) {
      case 'pasture':
        say(`M${'o'.repeat(Math.min(2 + moos, 14))}!`);
        break;
      case 'night': // wakes, mutters, goes back to sleep
        walker.classList.add('is-awake');
        say(next('night', ['...moo?', 'Mmf. Moo.', 'Five more minutes.']), 2400);
        break;
      case 'sunset':
        say(next('sunset', ['Moo.', 'So pretty.', 'Mooooo...']), 2000);
        break;
      case 'river': {
        say(next('river', ['Moo-hoy!', 'Row, row, moo.', 'Moo!']));
        const water = scene().querySelector<HTMLElement>('[data-zone="water"]');
        const box = walker.getBoundingClientRect();
        if (water) ripple(water, box.left + box.width / 2, box.bottom + 6);
        break;
      }
      case 'space': // nobody can hear it, but it sends the cow spinning
        walker.classList.add('is-spinning');
        say(next('space', ['(moo)', '(moo?)', '(mooooo)']));
        float.vx += between(-140, 140);
        float.vy += between(-140, 140);
        break;
    }
  }

  // ---------- space: the cow floats, and can be thrown ---------------------

  const float = { x: 0, y: 0, vx: 16, vy: -10, placed: false, frame: 0, last: 0 };
  let grab: { id: number; dx: number; dy: number; x: number; y: number; moved: boolean; trail: { t: number; x: number; y: number }[] } | null =
    null;
  let thrown = false;

  function keepInside(bounce: boolean): void {
    const top = layer?.getBoundingClientRect().top ?? 0;
    const maxX = Math.max(0, window.innerWidth - walker.offsetWidth);
    const maxY = Math.max(top, window.innerHeight - walker.offsetHeight);
    if (float.x < 0 || float.x > maxX) {
      float.x = Math.min(Math.max(float.x, 0), maxX);
      if (bounce) float.vx = -float.vx;
    }
    if (float.y < top || float.y > maxY) {
      float.y = Math.min(Math.max(float.y, top), maxY);
      if (bounce) float.vy = -float.vy;
    }
  }

  const draw = () => (walker.style.translate = `${Math.round(float.x)}px ${Math.round(float.y)}px`);

  function tick(now: number): void {
    const dt = Math.min(0.05, (now - float.last) / 1000);
    float.last = now;
    if (!grab?.moved) {
      float.x += float.vx * dt;
      float.y += float.vy * dt;
      keepInside(true);
      // A throw slows down to a lazy drift, and a drift never quite stops.
      const speed = Math.hypot(float.vx, float.vy);
      if (speed > 20) {
        const slow = Math.max(20 / speed, 1 - 1.4 * dt);
        float.vx *= slow;
        float.vy *= slow;
      } else if (speed < 8) {
        float.vx += between(-6, 6);
        float.vy += between(-6, 6);
      }
      draw();
    }
    float.frame = window.requestAnimationFrame(tick);
  }

  function syncFloat(): void {
    window.cancelAnimationFrame(float.frame);
    float.frame = 0;
    if (current() !== 'space') {
      walker.style.translate = '';
      return;
    }
    if (!float.placed) {
      float.x = window.innerWidth * 0.56;
      float.y = window.innerHeight * 0.38;
      float.placed = true;
    }
    keepInside(false);
    draw();
    if (animated()) {
      float.last = performance.now();
      float.frame = window.requestAnimationFrame(tick);
    }
  }

  cow.addEventListener('pointerdown', (e) => {
    if (current() !== 'space' || e.button !== 0 || grab) return;
    grab = { id: e.pointerId, dx: e.clientX - float.x, dy: e.clientY - float.y, x: e.clientX, y: e.clientY, moved: false, trail: [] };
    cow.setPointerCapture(e.pointerId);
  });

  cow.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    if (!grab.moved && Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < 5) return;
    grab.moved = true;
    walker.classList.add('is-thrown');
    float.x = e.clientX - grab.dx;
    float.y = e.clientY - grab.dy;
    keepInside(false);
    draw();
    grab.trail.push({ t: performance.now(), x: e.clientX, y: e.clientY });
    if (grab.trail.length > 6) grab.trail.shift();
  });

  const letGo = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grab.id) return;
    if (grab.moved) {
      // Throw it as fast as the last few moments of the drag.
      const first = grab.trail[0];
      const last = grab.trail[grab.trail.length - 1];
      const seconds = first && last ? (last.t - first.t) / 1000 : 0;
      if (seconds > 0.01 && performance.now() - last.t < 120) {
        float.vx = Math.max(-1200, Math.min(1200, (last.x - first.x) / seconds));
        float.vy = Math.max(-1200, Math.min(1200, (last.y - first.y) / seconds));
      }
      thrown = true; // the click that follows is the end of a throw, not a pet
      window.setTimeout(() => (thrown = false), 300);
    }
    walker.classList.remove('is-thrown');
    grab = null;
  };
  cow.addEventListener('pointerup', letGo);
  cow.addEventListener('pointercancel', letGo);
  cow.addEventListener(
    'click',
    (e) => {
      if (!thrown) return;
      thrown = false;
      e.stopImmediatePropagation();
    },
    true,
  );

  window.addEventListener('resize', () => {
    if (current() !== 'space') return;
    keepInside(false);
    draw();
  });

  // ---------- choosing ------------------------------------------------------

  function sync(): void {
    const id = current();
    root.dataset.wallpaper = id;
    document.querySelectorAll<HTMLElement>('[data-wallpaper-pick]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.wallpaperPick === id));
    });
    document.querySelectorAll<HTMLInputElement>('[data-setting-motion]').forEach((input) => {
      input.checked = root.dataset.motion !== 'off';
    });
    themeMeta?.setAttribute('content', wallpapers.find((w) => w.id === id)?.theme ?? '#07a2ea');
    syncFloat();
  }

  function set(id: WallpaperId): void {
    if (id === current()) return;
    hush();
    root.dataset.wallpaper = id;
    settings.wallpaper = id;
    save();
    sync();
  }

  document.querySelectorAll<HTMLElement>('[data-wallpaper-pick]').forEach((button) => {
    button.addEventListener('click', () => {
      if (isWallpaper(button.dataset.wallpaperPick)) set(button.dataset.wallpaperPick);
    });
  });

  document.querySelectorAll<HTMLInputElement>('[data-setting-motion]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) delete root.dataset.motion;
      else root.dataset.motion = 'off';
      settings.motion = input.checked ? 'on' : 'off';
      save();
      sync();
    });
  });

  reduced.addEventListener('change', syncFloat);
  sync();

  return { current, set, poke, pet };
}
