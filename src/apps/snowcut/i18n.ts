export type Lang = 'en' | 'es';

const STORAGE_KEY = 'snowcut-lang';

const STRINGS = {
  en: {
    docTitle: 'Snowcut — paper snowflake maker',
    paperLabel: 'Paper:',
    printPdf: 'PRINT PDF',
    pattern: 'PATTERN',
    preview: 'PREVIEW',
    toolDraw: 'Draw',
    toolErase: 'Erase',
    toolUndo: 'Undo',
    toolClear: 'Clear all',
    randomPattern: 'RANDOM PATTERN',
    drawHint: 'or draw your own shapes on the folded paper',
    show: 'SHOW',
    hide: 'HIDE',
    secretText: 'Your snowflake is a secret.<br>Cut it to find out!',
    hintHidden: 'Tap SHOW if you want to peek before cutting.',
    hintRevealed: 'This is what your paper becomes. Tap HIDE to keep the magic.',
    step1: 'Print the sheet',
    step2: 'Fold 3 times',
    step3: 'Cut out the shapes',
    step4: 'Unfold your snowflake',
    modalTitle: 'Reveal the secret?',
    modalBody:
      'The best part is unfolding the paper and seeing your snowflake for the very first time. Are you sure you want to peek?',
    modalKeep: 'KEEP IT SECRET',
    modalShow: 'SHOW ME ANYWAY',
    pdfSteps: [
      'One straight cut along the line above — now you have a square.',
      'Fold in half: bottom edge goes BEHIND, up to the top.',
      'Fold in half again: left side goes BEHIND, to the right.',
      'Fold the bottom-right corner BEHIND, along the dashed slant.',
      'Cut out the striped shapes. Unfold gently. Surprise!',
    ],
  },
  es: {
    docTitle: 'Snowcut — crea copos de nieve de papel',
    paperLabel: 'Papel:',
    printPdf: 'IMPRIMIR PDF',
    pattern: 'PATRÓN',
    preview: 'VISTA PREVIA',
    toolDraw: 'Dibujar',
    toolErase: 'Borrar',
    toolUndo: 'Deshacer',
    toolClear: 'Borrar todo',
    randomPattern: 'PATRÓN AL AZAR',
    drawHint: 'o dibuja tus propias formas en el papel doblado',
    show: 'MOSTRAR',
    hide: 'OCULTAR',
    secretText: 'Tu copo de nieve es un secreto.<br>¡Recórtalo para descubrirlo!',
    hintHidden: 'Toca MOSTRAR si quieres espiar antes de recortar.',
    hintRevealed: 'En esto se convierte tu papel. Toca OCULTAR para guardar la magia.',
    step1: 'Imprime la hoja',
    step2: 'Dobla 3 veces',
    step3: 'Recorta las formas',
    step4: 'Despliega tu copo de nieve',
    modalTitle: '¿Revelamos el secreto?',
    modalBody:
      'Lo mejor es desplegar el papel y ver tu copo de nieve por primera vez. ¿Seguro que quieres espiar?',
    modalKeep: 'QUE SIGA SECRETO',
    modalShow: 'MUÉSTRAMELO IGUAL',
    pdfSteps: [
      'Un corte recto por la línea de arriba — y ya tienes un cuadrado.',
      'Dobla por la mitad: el borde de abajo va POR DETRÁS, hacia arriba.',
      'Dobla otra vez por la mitad: el lado izquierdo va POR DETRÁS, hacia la derecha.',
      'Dobla la esquina inferior derecha POR DETRÁS, por la línea inclinada.',
      'Recorta las formas rayadas. Despliega con cuidado. ¡Sorpresa!',
    ],
  },
} as const;

export type TextKey = Exclude<keyof (typeof STRINGS)['en'], 'pdfSteps'>;

let current: Lang = detectLang();

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // storage can be blocked; fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // not persisted; the choice still applies for this visit
  }
}

export function t(key: TextKey): string {
  return STRINGS[current][key];
}

export function pdfSteps(): readonly string[] {
  return STRINGS[current].pdfSteps;
}
