// The language the interface speaks. The game itself keeps its messages in English, and this
// module turns them into the player's language when they are shown.
import { BDEFS, type BType, type Good } from './game';

export type Lang = 'en' | 'pl';
export const LANGS: Lang[] = ['en', 'pl'];
const KEY = 'hitoria.lang';

let lang: Lang = 'en';
export const getLang = () => lang;

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {} // storage may be blocked; the choice then lasts until the page closes
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

// The language to start in: the one the player picked last time, or the browser's.
export function startLang(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}
  if (saved === 'en' || saved === 'pl') return saved;
  const browser = typeof navigator !== 'undefined' ? navigator.language ?? '' : '';
  return browser.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

// Polish nouns take one of three forms after a number: 1 dom, 2 domy, 5 domów.
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const ten = n % 10, hundred = n % 100;
  return ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14) ? few : many;
}

// Join names into "a, b and c". `last` is the word before the final name.
export const join = (names: string[], last: string) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${last} ${names[names.length - 1]}`;

const BUILDING_PL: Record<BType, { name: string; desc: string }> = {
  hq: { name: 'Siedziba', desc: 'Przechowuje wszystkie towary i daje dach wolnym osadnikom.' },
  woodcutter: { name: 'Chata drwala', desc: 'Ścina dorosłe drzewa w pobliżu i dostarcza kłody.' },
  forester: { name: 'Chata leśnika', desc: 'Sadzi sadzonki, z których wyrastają nowe drzewa.' },
  quarry: { name: 'Kamieniołom', desc: 'Rozbija pobliskie głazy na kamień.' },
  sawmill: { name: 'Tartak', desc: 'Tnie kłody na deski.' },
  lookout: { name: 'Wieża widokowa', desc: 'Poszerza twoje ziemie. Żadnych żołnierzy, tylko widok.' },
  storehouse: { name: 'Magazyn', desc: 'Przechowuje zapasy blisko miejsc, w których się je wytwarza i zużywa.' },
  fisher: { name: 'Chata rybaka', desc: 'Łowi ryby w pobliskiej wodzie. Zbuduj ją blisko brzegu.' },
  farm: { name: 'Gospodarstwo', desc: 'Sieje zboże na wolnej trawie w pobliżu i zbiera je, gdy dojrzeje.' },
  mill: { name: 'Młyn', desc: 'Miele zboże na mąkę.' },
  bakery: { name: 'Piekarnia', desc: 'Piecze chleb z mąki.' },
  mine: {
    name: 'Kopalnia kamienia',
    desc: 'Wydobywa kamień z góry i nigdy się nie wyczerpuje. Górnik zjada jedną rybę lub bochenek chleba na każde 2 kamienie. Zbuduj ją przy górze.',
  },
};

export const buildingName = (t: BType) => (lang === 'pl' ? BUILDING_PL[t].name : BDEFS[t].name);
export const buildingDesc = (t: BType) => (lang === 'pl' ? BUILDING_PL[t].desc : BDEFS[t].desc);

// Goods as a label, as in "Planks: 4".
const GOOD_EN: Record<Good, string> = {
  log: 'Logs', plank: 'Planks', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread',
};
const GOOD_PL: Record<Good, string> = {
  log: 'Kłody', plank: 'Deski', stone: 'Kamień', fish: 'Ryby', grain: 'Zboże', flour: 'Mąka', bread: 'Chleb',
};
export const goodName = (g: Good) => (lang === 'pl' ? GOOD_PL : GOOD_EN)[g];

// Fixed messages from the game (statuses and reasons it refuses something), in Polish.
const MESSAGES_PL: Record<string, string> = {
  // Building statuses
  'Waiting for a builder': 'Czeka na budowniczego',
  'Builder on the way': 'Budowniczy jest w drodze',
  'Waiting for a free settler': 'Czeka na wolnego osadnika',
  'Waiting for materials': 'Czeka na materiały',
  'Needs a road to your HQ': 'Potrzebuje drogi do siedziby',
  'Under construction': 'W budowie',
  'Unreachable, retrying soon': 'Nie da się tu dojść, wkrótce kolejna próba',
  'Waiting for a worker': 'Czeka na pracownika',
  'Storing goods': 'Przechowuje towary',
  'Flag is full, waiting for a carrier': 'Flaga jest pełna, czeka na tragarza',
  'No grown trees in range': 'Brak dorosłych drzew w zasięgu',
  'No boulders in range': 'Brak głazów w zasięgu',
  'Felling a tree': 'Ścina drzewo',
  'Breaking stone': 'Kruszy kamień',
  'No free ground to plant on': 'Brak wolnego miejsca do sadzenia',
  'Planting a tree': 'Sadzi drzewo',
  'No shore in range': 'Brak brzegu w zasięgu',
  Fishing: 'Łowi ryby',
  'Waiting for the grain to ripen': 'Czeka, aż zboże dojrzeje',
  'Harvesting grain': 'Zbiera zboże',
  'Sowing grain': 'Sieje zboże',
  'Keeping watch over your land': 'Pilnuje twoich ziem',
  'Sawing planks': 'Tnie deski',
  'Waiting for logs': 'Czeka na kłody',
  'Grinding flour': 'Miele mąkę',
  'Waiting for grain': 'Czeka na zboże',
  'Baking bread': 'Piecze chleb',
  'Waiting for flour': 'Czeka na mąkę',
  'Digging stone': 'Wydobywa kamień',
  'Waiting for fish or bread': 'Czeka na ryby lub chleb',
  // Why a building can't go here
  'Outside the map': 'Poza mapą',
  Occupied: 'Zajęte',
  'Outside your land': 'Poza twoimi ziemiami',
  'Needs flat grass': 'Potrzebna płaska trawa',
  'A tree is in the way': 'Przeszkadza drzewo',
  'A boulder is in the way': 'Przeszkadza głaz',
  'Must be next to a mountain': 'Musi stać przy górze',
  'Must be near water': 'Musi stać blisko wody',
  'No room for its flag in front': 'Brak miejsca na flagę przed budynkiem',
  'No road can reach it': 'Żadna droga tu nie dotrze',
  'Unknown building': 'Nieznany budynek',
  // Roads and removing
  'Roads start at a flag, a building, or free ground away from other flags':
    'Drogę zaczynasz od flagi, budynku albo wolnego pola z dala od innych flag',
  'No room for a road there': 'Tu nie zmieści się droga',
  'Nothing to remove here': 'Nie ma tu nic do usunięcia',
  'Demolishing buildings is not in yet': 'Burzenia budynków jeszcze nie ma',
};

const BTYPES = Object.keys(BDEFS) as BType[];

// Turn a message from the game into the current language. Unknown messages stay as they are.
export function tr(msg: string): string {
  if (lang === 'en') return msg;
  if (MESSAGES_PL[msg]) return MESSAGES_PL[msg];
  // "🪓 Woodcutter's Hut finished"
  for (const t of BTYPES) {
    const def = BDEFS[t];
    if (msg === `${def.icon} ${def.name} finished`) return `${def.icon} Gotowe: ${BUILDING_PL[t].name}`;
  }
  return msg;
}

// The messages tr() knows, for tests.
export const knownMessages = () => Object.keys(MESSAGES_PL);

// Every other piece of interface text, in each language.
const EN = {
  langButton: '🇵🇱 Polski',
  langTitle: 'Graj po polsku',
  save: '💾 Save',
  saveTitle: 'Save the game you are playing (Ctrl+S)',
  saves: '📂 Saves',
  savesTitle: 'Load, save as new, delete saves, or change the autosave',
  newGame: '🏝️ New',
  newTitle: 'Start a new island',
  report: '🐞 Report',
  reportTitle: 'Something looks wrong? Make a report for Claude. Press F3 for live diagnostics.',
  pause: 'Pause (space)',
  help: 'Drag to pan · Scroll to zoom · 1–5 to build · R road · X remove · Right-click to cancel · Ctrl+S save · F3 diagnostics',
  road: 'Road',
  roadDesc: 'Click a flag or building, then where the road should go. Keeps going from the new end until you right-click.',
  remove: 'Remove',
  removeDesc: 'Remove a road or a lone flag.',
  key: (k: string) => `key ${k}`,
  settlers: (idle: number, busy: number) => `<b>${idle}</b> idle / ${busy} busy`,
  whyBuild: 'Why build it',
  whatNeeds: 'What it needs',
  costs: 'Costs',
  landRadius: (n: number) => `Land radius: ${n} tiles`,
  stored: 'Stored:',
  input: 'In:',
  ready: 'Ready:',
  notLinked: 'Not connected to your HQ by road',
  welcome: 'Welcome! Place a woodcutter, then press R and draw a road from its flag to your HQ.',
  welcomeBack: (name: string) => `Welcome back to "${name}"! Your settlers are heading back to work.`,
  newIsland: 'A new island! Place a woodcutter, then press R and draw a road from its flag to your HQ.',
  confirmNew: 'Start a new island? Save first if you want to come back to this one.',
  island: (seed: number) => `Island ${seed}`,
  saved: (name: string) => `Saved as "${name}"`,
  saveFailed: 'Could not save the game. The browser storage may be full or blocked. Try deleting an old save.',
  autosaveFailed: 'Could not autosave. The browser storage may be full. Try deleting an old save.',
  loadFailed: (name: string) => `Could not load "${name}". It may be from a different version of Hitoria.`,
  loaded: (name: string) => `Loaded "${name}"`,
  savedGames: 'Saved games',
  newSaveName: 'Name for a new save',
  saveAsNew: '💾 Save as new',
  autosave: 'Autosave',
  backToGame: '▶️ Back to the game',
  noSaves: 'No saved games yet.',
  load: '📂 Load',
  overwrite: '💾 Overwrite',
  overwriteTitle: 'Replace this save with the game you are playing',
  deleteTitle: 'Delete this save',
  confirmOverwrite: (name: string) => `Replace "${name}" with the game you are playing?`,
  confirmDelete: (name: string) => `Delete "${name}"? You can't undo this.`,
  autosaveOff: 'Off',
  autosaveMinute: 'Every minute',
  autosave5: 'Every 5 minutes',
  justNow: 'just now',
  minAgo: (m: number) => `${m} min ago`,
  hoursAgo: (h: number) => `${h} h ago`,
  slotInfo: (ago: string, played: string, people: number, seed: number) =>
    `${ago} · ${played} played · ${people} settlers · island ${seed}`,
  reportAsk: 'What looks wrong? For example: "The woodcutter never gets any logs to the sawmill."',
  reportTitleBox: 'Problem report',
  reportSaved: (file: string) => `Saved as ${file}. Tell Claude about it, or copy the report and paste it into the chat.`,
  reportCopyIntro: 'Copy this report and paste it into the chat.',
  crashTitle: 'Hitoria crashed',
  crashIntro: 'The game has stopped. Your last save is safe. Copy this report and paste it into the chat.',
  copyReport: '📋 Copy report',
  copied: '✅ Copied',
  reload: '🔄 Reload from last save',
};

const PL: typeof EN = {
  langButton: '🇬🇧 English',
  langTitle: 'Play in English',
  save: '💾 Zapisz',
  saveTitle: 'Zapisz grę, w którą grasz (Ctrl+S)',
  saves: '📂 Zapisy',
  savesTitle: 'Wczytaj, zapisz jako nowy, usuń zapis albo zmień autozapis',
  newGame: '🏝️ Nowa',
  newTitle: 'Zacznij na nowej wyspie',
  report: '🐞 Zgłoś',
  reportTitle: 'Coś wygląda źle? Przygotuj zgłoszenie dla Claude. F3 pokazuje diagnostykę na żywo.',
  pause: 'Pauza (spacja)',
  help: 'Przeciągnij, by przesunąć · Kółko przybliża · 1–5 buduje · R droga · X usuń · Prawy przycisk anuluje · Ctrl+S zapis · F3 diagnostyka',
  road: 'Droga',
  roadDesc: 'Kliknij flagę lub budynek, a potem miejsce, do którego ma biec droga. Droga biegnie dalej od nowego końca, aż klikniesz prawym przyciskiem.',
  remove: 'Usuń',
  removeDesc: 'Usuwa drogę albo samotną flagę.',
  key: (k: string) => `klawisz ${k}`,
  settlers: (idle: number, busy: number) => `<b>${idle}</b> ${plural(idle, 'wolny', 'wolni', 'wolnych')} / ${busy} przy pracy`,
  whyBuild: 'Po co budować',
  whatNeeds: 'Czego potrzebuje',
  costs: 'Koszt:',
  landRadius: (n: number) => `Zasięg ziem: ${n} ${plural(n, 'pole', 'pola', 'pól')}`,
  stored: 'W magazynie:',
  input: 'Wsad:',
  ready: 'Gotowe:',
  notLinked: 'Brak drogi do siedziby',
  welcome: 'Witaj! Postaw chatę drwala, potem naciśnij R i poprowadź drogę od jej flagi do siedziby.',
  welcomeBack: (name: string) => `Witaj z powrotem w „${name}”! Twoi osadnicy wracają do pracy.`,
  newIsland: 'Nowa wyspa! Postaw chatę drwala, potem naciśnij R i poprowadź drogę od jej flagi do siedziby.',
  confirmNew: 'Zacząć na nowej wyspie? Najpierw zapisz grę, jeśli chcesz do niej wrócić.',
  island: (seed: number) => `Wyspa ${seed}`,
  saved: (name: string) => `Zapisano jako „${name}”`,
  saveFailed: 'Nie udało się zapisać gry. Pamięć przeglądarki może być pełna lub zablokowana. Spróbuj usunąć stary zapis.',
  autosaveFailed: 'Autozapis się nie udał. Pamięć przeglądarki może być pełna. Spróbuj usunąć stary zapis.',
  loadFailed: (name: string) => `Nie udało się wczytać „${name}”. Ten zapis może pochodzić z innej wersji Hitorii.`,
  loaded: (name: string) => `Wczytano „${name}”`,
  savedGames: 'Zapisane gry',
  newSaveName: 'Nazwa nowego zapisu',
  saveAsNew: '💾 Zapisz jako nowy',
  autosave: 'Autozapis',
  backToGame: '▶️ Wróć do gry',
  noSaves: 'Nie masz jeszcze zapisanych gier.',
  load: '📂 Wczytaj',
  overwrite: '💾 Nadpisz',
  overwriteTitle: 'Zastąp ten zapis grą, w którą grasz',
  deleteTitle: 'Usuń ten zapis',
  confirmOverwrite: (name: string) => `Zastąpić „${name}” grą, w którą grasz?`,
  confirmDelete: (name: string) => `Usunąć „${name}”? Tego nie da się cofnąć.`,
  autosaveOff: 'Wyłączony',
  autosaveMinute: 'Co minutę',
  autosave5: 'Co 5 minut',
  justNow: 'przed chwilą',
  minAgo: (m: number) => `${m} min temu`,
  hoursAgo: (h: number) => `${h} godz. temu`,
  slotInfo: (ago: string, played: string, people: number, seed: number) =>
    `${ago} · ${played} gry · ${people} ${plural(people, 'osadnik', 'osadników', 'osadników')} · wyspa ${seed}`,
  reportAsk: 'Co wygląda źle? Na przykład: „Drwal nigdy nie dowozi kłód do tartaku”.',
  reportTitleBox: 'Zgłoszenie problemu',
  reportSaved: (file: string) => `Zapisano jako ${file}. Powiedz o nim Claude albo skopiuj zgłoszenie i wklej je do czatu.`,
  reportCopyIntro: 'Skopiuj to zgłoszenie i wklej je do czatu.',
  crashTitle: 'Hitoria uległa awarii',
  crashIntro: 'Gra się zatrzymała. Twój ostatni zapis jest bezpieczny. Skopiuj to zgłoszenie i wklej je do czatu.',
  copyReport: '📋 Kopiuj zgłoszenie',
  copied: '✅ Skopiowano',
  reload: '🔄 Wczytaj ostatni zapis',
};

// The interface text in the current language.
export const T = () => (lang === 'pl' ? PL : EN);
