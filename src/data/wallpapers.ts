// The wallpapers the desktop can wear. Each one is a small scene with the
// cow in it, and each one answers when you click it (src/scripts/wallpapers.ts).

export interface Wallpaper {
  id: string;
  name: string;
  /** What the cow is up to, shown in Settings. */
  blurb: string;
  /** Browser chrome colour on phones. */
  theme: string;
  /** A tiny banded preview for the picker. */
  preview: string;
}

export const wallpapers = [
  {
    id: 'pasture',
    name: 'Pasture',
    blurb: 'A walk in the field. Click the grass.',
    theme: '#07a2ea',
    preview: 'linear-gradient(#07a2ea 0 58%, #58c3f3 58% 68%, #4ade80 68% 84%, #3ecf74 84%)',
  },
  {
    id: 'night',
    name: 'Night',
    blurb: 'The cow is asleep. Click the sky.',
    theme: '#0a1030',
    preview: 'linear-gradient(#0a1030 0 46%, #121a45 46% 58%, #1b2760 58% 68%, #1f7a4c 68% 84%, #1a6a42 84%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Watching the sun go down. Click the sun.',
    theme: '#4a2f7a',
    preview: 'linear-gradient(#4a2f7a 0 16%, #8a4391 16% 30%, #cf5680 30% 42%, #f27d5e 42% 54%, #f9aa5e 54% 62%, #fdd681 62% 68%, #3a2a4a 68% 84%, #33243f 84%)',
  },
  {
    id: 'river',
    name: 'River',
    blurb: 'Rafting downstream. Click the water.',
    theme: '#49c3ee',
    preview: 'linear-gradient(#49c3ee 0 44%, #8fdcf5 44% 52%, #2fae62 52% 58%, #1e8fd6 58% 84%, #4ade80 84%)',
  },
  {
    id: 'space',
    name: 'Space',
    blurb: 'Floating. Drag the cow and let go.',
    theme: '#0b0820',
    preview: 'linear-gradient(#0b0820 0 40%, #120d2e 40% 72%, #1a1240 72%)',
  },
] as const satisfies readonly Wallpaper[];

export type WallpaperId = (typeof wallpapers)[number]['id'];

export const isWallpaper = (id: unknown): id is WallpaperId => wallpapers.some((w) => w.id === id);
