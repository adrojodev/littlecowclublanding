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
};

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
} satisfies Record<string, string[]>;

export type SpriteName = keyof typeof sprites;
