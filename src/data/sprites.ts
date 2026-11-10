// Hand-placed pixel art for the desktop. One character = one pixel.
// Colours come from the cow itself: cream hide, brown spots, the red
// collar, the gold bell and the pink udder.

export const palette: Record<string, string> = {
  k: '#2f2823', // ink
  b: '#64574d', // cow brown
  c: '#f0ece4', // cream
  w: '#ffffff',
  d: '#b9b2a6', // tin
  D: '#8f887c', // tin shadow
  r: '#ff6340', // collar red
  R: '#d84e2f', // collar shadow
  y: '#e8b644', // bell gold
  p: '#efcbda', // udder pink
  P: '#d99bb4',
  g: '#4ade80', // grass
  G: '#1f9d4d',
  s: '#bfe6fa', // cloud shade
  K: '#000000', // the cow's eye
  Y: '#fbca59', // horn
  h: '#e7e4df', // far legs
  m: '#f6edc8', // moon
  M: '#d9cfa3',
  o: '#ffd36b', // sun
  O: '#ffb347',
  u: '#aab4c4', // saucer metal
  U: '#6b7686',
  L: '#9ff5c9', // saucer glass
  n: '#9a6a44', // raft logs
  N: '#6b432a',
  f: '#ff9d5c', // fish
  F: '#e0703a',
  v: '#b48cf2', // planet
  V: '#8a63d2',
  q: '#f4d9a0', // planet ring
};

/** Draw a sprite from a function instead of by hand: good for circles. */
function paint(width: number, height: number, at: (x: number, y: number) => string): string[] {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => at(x, y)).join(''));
}

/** Distance from the middle of pixel (x, y) to a point. */
const far = (x: number, y: number, cx: number, cy: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

// The cow, facing left. Every other pose starts from this one.
const cow = [
  '....Y.c....................',
  '...cYccc...................',
  '..ccccccrbbbbbbcccccbbbb...',
  '.ccKccccrbbbbbcccccbbbbbb..',
  'ccccccccrbbbbccccccbbbbbbcc',
  'ccccccccrbbccccccccbbbbbb.c',
  '.cc..cccrbbbccccccccbbbbb.c',
  '......ccrbbcccbbbbcccbbbc.b',
  '.......crccccbbbbbcccccc...',
  '.......yycccccbbbccccccc...',
  '.......yycccccbcccpppccc...',
  '.........cchh...ppppphcc...',
  '.........cchh....p.p.hcc...',
  '.........cc.h........hcc...',
  '.........c..h........h.c...',
  '.........c.bb.......bb.c...',
  '........bb............bb...',
];

// Lying down: the same body with the legs folded under it.
const cowLie = [
  ...cow.slice(0, 10),
  '.......yycccccbccccccccc...',
  '.........bbccbb.....ccbb...',
];

// Asleep: the eye becomes a closed line.
const cowSleep = cowLie.map((row, y) => (y === 3 ? row.replace('K', 'c') : y === 4 ? `cckk${row.slice(4)}` : row));

// In space: a glass helmet around the head.
const HELMET = { pad: 3, cx: 7.5, cy: 7, r: 6.6 };
const cowSpace = paint(cow[0].length + HELMET.pad, cow.length + HELMET.pad, (x, y) => {
  const d = far(x, y, HELMET.cx, HELMET.cy);
  const body = cow[y - HELMET.pad]?.[x - HELMET.pad] ?? '.';
  if (d >= HELMET.r - 1 && d < HELMET.r) return x < HELMET.cx && y < HELMET.cy - 2 ? 'w' : 's';
  return body;
});

const craters = new Set(['3,4', '4,4', '6,8', '7,8', '7,9', '3,7', '9,5']);
const moonFull = paint(12, 12, (x, y) => (far(x, y, 6, 6) < 6 ? (craters.has(`${x},${y}`) ? 'M' : 'm') : '.'));
const moon = moonFull.map((row, y) => [...row].map((ch, x) => (far(x, y, 9.5, 4.5) < 5.4 ? '.' : ch)).join(''));

const sun = paint(24, 24, (x, y) => {
  const d = far(x, y, 12, 12);
  return d < 10.5 ? 'o' : d < 12 ? 'O' : '.';
});

const planet = paint(26, 16, (x, y) => {
  const d = far(x, y, 13, 8);
  const ring = (y === 9 && (x < 6 || x > 19)) || (y === 10 && x > 2 && x < 23);
  if (ring && (y === 10 || d >= 8)) return 'q';
  if (d >= 8) return '.';
  return y % 4 === 1 || (y % 4 === 2 && x % 5 < 3) ? 'V' : 'v';
});

export const sprites = {
  barn: [
    '................',
    '.......kk.......',
    '......kRRk......',
    '.....kRrrRk.....',
    '....kRrrrrRk....',
    '...kRrrccrrRk...',
    '..kRrrrccrrrRk..',
    '.kkkkkkkkkkkkkk.',
    '..krrrrrrrrrrk..',
    '..krrkkkkkkrrk..',
    '..krrkcbbckrrk..',
    '..krrkbccbkrrk..',
    '..krrkbccbkrrk..',
    '..krrkcbbckrrk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  cowface: [
    '................',
    '..yy........yy..',
    '..kyk......kyk..',
    '.kkkkkkkkkkkkkk.',
    'kbbkcccccbbbkbbk',
    'kbbkcccccbbbkbbk',
    '.kkkckcccckbkkk.',
    '...kckcccckbk...',
    '...kcccccccck...',
    '..kppppppppppk..',
    '..kpkppppppkpk..',
    '..kpkppppppkpk..',
    '..kppppppppppk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  letter: [
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kckcccccccckck.',
    '.kcckcccccckcck.',
    '.kccckcccckccck.',
    '.kcccckcckcccck.',
    '.kccccrrrrcccck.',
    '.kccccrrrrcccck.',
    '.kccccRRRRcccck.',
    '.kcccccccccccck.',
    '.kcccccccccccck.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  pail: [
    '................',
    '....kkkkkkkk....',
    '...k........k...',
    '..k..........k..',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '..kdwddddddDDk..',
    '..kdwddddddDDk..',
    '..kdwddddddDDk..',
    '..kkkkkkkkkkkk..',
    '...kdwddddDDk...',
    '...kdwddddDDk...',
    '...kdwddddDDk...',
    '...kkkkkkkkkk...',
    '................',
  ],
  cloud: [
    '........wwwwww..............',
    '......wwwwwwwwww............',
    '....wwwwwwwwwwwwww..wwww....',
    '..wwwwwwwwwwwwwwwwwwwwwwww..',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    '..sssssssssssssssssssssss...',
  ],
  cloudSmall: [
    '....wwwwww......',
    '..wwwwwwwwwwww..',
    'wwwwwwwwwwwwwwww',
    '..ssssssssssss..',
  ],
  flower: [
    '.w.',
    'wyw',
    '.w.',
    '.G.',
    '.G.',
  ],
  flowerRed: [
    '.r.',
    'ryr',
    '.r.',
    '.G.',
    '.G.',
  ],
  tuft: [
    'G...G',
    'G.G.G',
    'GGGGG',
  ],
  gear: [
    '......kkkk......',
    '..kk..kddk..kk..',
    '.kddkkkddkkkddk.',
    '.kdddddddddddDk.',
    '..kdddkkkkdDDk..',
    '..kddkk..kkdDk..',
    'kkkddk....kdDkkk',
    'kddddk....kdDDDk',
    'kddddk....kdDDDk',
    'kkkddk....kdDkkk',
    '..kddkk..kkdDk..',
    '..kdddkkkkdDDk..',
    '.kdddddddDDDDDk.',
    '.kddkkkdDkkkDDk.',
    '..kk..kDDk..kk..',
    '......kkkk......',
  ],
  cow,
  cowLie,
  cowSleep,
  cowSpace,
  moon,
  moonFull,
  sun,
  planet,
  ufo: [
    '....sssss....',
    '...sLLLLLs...',
    '.uuuuuuuuuuu.',
    'uUyUUyUUyUUyu',
    '.UUUUUUUUUUU.',
  ],
  raft: [
    '.nnnnnnnnnnnnnnnnnnnnnnnnnnnnn.',
    'nnNnnnnnNnnnnnNnnnnnNnnnnnNnnnn',
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
  ],
  bird: [
    '.kk...kk.',
    'k..k.k..k',
    '....k....',
  ],
  fish: [
    '..fff...',
    '.fffff.f',
    'fKffffff',
    '.fffff.f',
    '..FFF...',
  ],
} satisfies Record<string, string[]>;

export type SpriteName = keyof typeof sprites;
