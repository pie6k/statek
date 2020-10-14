import { store } from 'statek';

let idCounter = 1;

export interface Row {
  id: number;
  label: string;
  isSelected: boolean;
}

// prettier-ignore
const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
// prettier-ignore
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
// prettier-ignore
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

function randomSentence() {
  return `${adjectives[random(adjectives.length)]} ${
    colours[random(colours.length)]
  } ${nouns[random(nouns.length)]}`;
}

function random(max: number) {
  return Math.round(Math.random() * 1000) % max;
}

const ROWS_TEST_BASE = 1000;

export const appStore = store({
  rows: [] as Row[],
  selectedRow: null as Row | null,
  deselectSelected() {
    if (appStore.selectedRow) {
      appStore.selectedRow.isSelected = false;
      appStore.selectedRow = null;
    }
  },
  buildRows(numOfRows: number) {
    for (let i = 0; i < numOfRows; i++) {
      appStore.rows.push({
        id: idCounter++,
        label: randomSentence(),
        isSelected: false,
      });
    }

    appStore.deselectSelected();
  },
  run() {
    appStore.rows = [];
    appStore.buildRows(ROWS_TEST_BASE);
  },
  add() {
    appStore.buildRows(ROWS_TEST_BASE);
  },
  update() {
    for (let i = 0; i < appStore.rows.length; i += 10) {
      appStore.rows[i].label += ' !!!';
    }
  },
  select(row: Row) {
    appStore.deselectSelected();
    appStore.selectedRow = row;
    row.isSelected = true;
  },
  delete(row: Row) {
    appStore.rows.splice(appStore.rows.indexOf(row), 1);
  },
  runLots() {
    appStore.rows = [];
    appStore.buildRows(ROWS_TEST_BASE * 10);
  },
  clear() {
    appStore.rows = [];
  },
  swapRows() {
    if (appStore.rows.length > ROWS_TEST_BASE - 2) {
      const temp = appStore.rows[1];
      appStore.rows[1] = appStore.rows[ROWS_TEST_BASE - 2];
      appStore.rows[ROWS_TEST_BASE - 2] = temp;
    }
  },
});

// @ts-ignore
window.store = appStore;
