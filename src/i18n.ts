// The language the interface speaks. The game itself keeps its messages in English, and this
// module turns them into the player's language when they are shown.
import { BDEFS, type BType, type Good } from './game';
import { BUILDING_PL } from './lang/buildings';

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

// The language to start in: the one the player picked last time, or else the first language in
// the browser's list that the game speaks, or else English.
export function startLang(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}
  if (saved === 'en' || saved === 'pl') return saved;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const browser = nav?.languages?.length ? nav.languages : [nav?.language ?? ''];
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    const found = LANGS.find((l) => l === base);
    if (found) return found;
  }
  return 'en';
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

export const buildingName = (t: BType) => (lang === 'pl' ? BUILDING_PL[t].name : BDEFS[t].name);
export const buildingDesc = (t: BType) => (lang === 'pl' ? BUILDING_PL[t].desc : BDEFS[t].desc);

// Goods as a label, as in "Planks: 4".
const GOOD_EN: Record<Good, string> = {
  log: 'Logs', plank: 'Planks', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread', water: 'Water', coal: 'Coal', ore: 'Iron Ore', meat: 'Meat', iron: 'Iron', tool: 'Tools',
};
const GOOD_PL: Record<Good, string> = {
  log: 'Kłody', plank: 'Deski', stone: 'Kamień', fish: 'Ryby', grain: 'Zboże', flour: 'Mąka', bread: 'Chleb', water: 'Woda', coal: 'Węgiel', ore: 'Ruda żelaza', meat: 'Mięso', iron: 'Żelazo', tool: 'Narzędzia',
};
export const goodName = (g: Good) => (lang === 'pl' ? GOOD_PL : GOOD_EN)[g];

// Fixed messages from the game (statuses and reasons it refuses something), in Polish.
const MESSAGES_PL: Record<string, string> = {
  // Building statuses
  'Waiting for a builder': 'Czeka na budowniczego',
  'Builder on the way': 'Budowniczy jest w drodze',
  'Waiting for a free settler': 'Czeka na wolnego osadnika',
  'Waiting for materials': 'Czeka na materiały',
  'No way to walk to your HQ': 'Brak przejścia do siedziby',
  'Under construction': 'W budowie',
  'Unreachable, retrying soon': 'Nie da się tu dojść, wkrótce kolejna próba',
  'Waiting for a worker': 'Czeka na pracownika',
  'Storing goods': 'Przechowuje towary',
  'Full, waiting for a carrier': 'Pełno, czeka na tragarza',
  'No grown trees in range': 'Brak dorosłych drzew w zasięgu',
  'No boulders in range': 'Brak głazów w zasięgu',
  'Felling a tree': 'Ścina drzewo',
  'Breaking stone': 'Kruszy kamień',
  'No free ground to plant on': 'Brak wolnego miejsca do sadzenia',
  'Planting a tree': 'Sadzi drzewo',
  'No shore in range': 'Brak brzegu w zasięgu',
  Fishing: 'Łowi ryby',
  'Waiting for the grain to ripen': 'Czeka, aż zboże dojrzeje',
  'Fields rest in winter': 'Zimą pola odpoczywają',
  'Harvesting grain': 'Zbiera zboże',
  'Sowing grain': 'Sieje zboże',
  'Keeping watch over your land': 'Pilnuje twoich ziem',
  'Sawing planks': 'Tnie deski',
  'Waiting for logs': 'Czeka na kłody',
  'Grinding flour': 'Miele mąkę',
  'Waiting for grain': 'Czeka na zboże',
  'Baking bread': 'Piecze chleb',
  'Waiting for flour': 'Czeka na mąkę',
  'Waiting for water': 'Czeka na wodę',
  'Drawing water': 'Czerpie wodę',
  'Digging stone': 'Wydobywa kamień',
  'Digging coal': 'Wydobywa węgiel',
  'Digging iron ore': 'Wydobywa rudę żelaza',
  'Waiting for food': 'Czeka na jedzenie',
  'Smelting iron': 'Wytapia żelazo',
  'Waiting for iron ore': 'Czeka na rudę żelaza',
  'Waiting for coal': 'Czeka na węgiel',
  'Waiting for a tool': 'Czeka na narzędzie',
  'Making tools': 'Robi narzędzia',
  'Waiting for iron': 'Czeka na żelazo',
  'Waiting for planks': 'Czeka na deski',
  Hunting: 'Poluje',
  'No animals in range': 'Brak zwierzyny w zasięgu',
  'A settler will be born soon': 'Wkrótce urodzi się osadnik',
  'House is full': 'Dom jest pełny',
  '👶 A new settler was born': '👶 Urodził się nowy osadnik',
  // Goals
  'Make 50 planks': 'Zrób 50 desek',
  'Bake 20 bread': 'Upiecz 20 bochenków chleba',
  'Grow to 30 settlers': 'Dojdź do 30 osadników',
  'Build 3 houses': 'Zbuduj 3 domy',
  'Build a monument': 'Zbuduj pomnik',
  'Get through a winter with no one hungry': 'Przetrwaj zimę tak, by nikt nie głodował',
  'Winter has begun. Get ready for the next one': 'Zima już trwa. Przygotuj się na następną',
  'Store food before winter comes': 'Zgromadź jedzenie, zanim przyjdzie zima',
  'Winter: no one has gone hungry yet': 'Zima: na razie nikt nie głoduje',
  'Someone went hungry. Try again next winter': 'Ktoś głodował. Spróbuj następnej zimy',
  'You got through the winter': 'Zima przetrwana',
  '🥶 A settler went hungry this winter': '🥶 Osadnik głodował tej zimy',
  'Settle the other island': 'Zasiedl drugą wyspę',
  'Mine 20 coal': 'Wydobądź 20 węgla',
  'Mine 20 iron ore': 'Wydobądź 20 rudy żelaza',
  'Make 10 iron': 'Wytop 10 żelaza',
  // The geologist
  'Surveying the mountain': 'Bada górę',
  'Every mountain nearby is surveyed': 'Wszystkie pobliskie góry są zbadane',
  '⭐ Your geologist found a rich spot': '⭐ Twój geolog znalazł bogate złoże',
  '⭐ A rich spot! This mine digs twice as fast': '⭐ Bogate złoże! Ta kopalnia wydobywa dwa razy szybciej',
  // Why a building can't go here
  'Outside the map': 'Poza mapą',
  Occupied: 'Zajęte',
  'Outside your land': 'Poza twoimi ziemiami',
  'Needs flat grass': 'Potrzebna płaska trawa',
  'A tree is in the way': 'Przeszkadza drzewo',
  'A boulder is in the way': 'Przeszkadza głaz',
  'Must be next to a mountain': 'Musi stać przy górze',
  'Coal and iron lie only in the mountains of the other island': 'Węgiel i żelazo są tylko w górach drugiej wyspy',
  'Must be near water': 'Musi stać blisko wody',
  'Must be near a mountain': 'Musi stać blisko góry',
  'Must be on the shore by open water': 'Musi stać na brzegu przy otwartej wodzie',
  'No room for its flag in front': 'Brak miejsca na flagę przed budynkiem',
  'No road can reach it': 'Żadna droga tu nie dotrze',
  'No room for its fields': 'Brak miejsca na pola',
  'This is a farm field': 'Tu jest pole farmy',
  'Unknown building': 'Nieznany budynek',
  // Roads and removing
  'Roads start at a flag, a building, or free ground away from other flags':
    'Drogę zaczynasz od flagi, budynku albo wolnego pola z dala od innych flag',
  'No room for a road there': 'Tu nie zmieści się droga',
  'Nothing to remove here': 'Nie ma tu nic do usunięcia',
  'The HQ cannot be demolished': 'Siedziby nie można zburzyć',
  'A landing harbour cannot be demolished': 'Portu założonego po wylądowaniu nie można zburzyć',
  // Sailing to settle
  'Build the harbour first': 'Najpierw zbuduj port',
  'Your settlers have already sailed': 'Twoi osadnicy już wypłynęli',
  'Needs more idle settlers': 'Potrzeba więcej wolnych osadników',
  'Needs more goods in your stores': 'Potrzeba więcej towarów w magazynach',
  'No free shore on the other island': 'Na drugiej wyspie nie ma wolnego brzegu',
  '⛵ A ship sets sail for the other island': '⛵ Statek wypływa na drugą wyspę',
  '⚓ Your settlers have landed on the other island': '⚓ Twoi osadnicy wylądowali na drugiej wyspie',
  // The trade ship
  '🚢 A trade ship is sailing to your harbour': '🚢 Statek kupiecki płynie do twojego portu',
  '🚢 The trade ship has tied up at your harbour': '🚢 Statek kupiecki przybił do twojego portu',
  'No trade ship is here': 'Nie ma tu statku kupieckiego',
  'Pick two different goods': 'Wybierz dwa różne towary',
  'Not enough goods to give': 'Za mało towarów do wymiany',
};

const BTYPES = Object.keys(BDEFS) as BType[];

// Turn a message from the game into the current language. Unknown messages stay as they are.
export function tr(msg: string): string {
  if (lang === 'en') return msg;
  if (MESSAGES_PL[msg]) return MESSAGES_PL[msg];
  const goal = msg.match(/^🏆 Goal reached: (.+)$/);
  if (goal) return `🏆 Cel osiągnięty: ${tr(goal[1])}`;
  // "🪓 Woodcutter's Hut finished" and "🪓 Woodcutter's Hut demolished"
  for (const t of BTYPES) {
    const def = BDEFS[t];
    if (msg === `${def.icon} ${def.name} finished`) return `${def.icon} Gotowe: ${BUILDING_PL[t].name}`;
    if (msg === `${def.icon} ${def.name} demolished`) return `${def.icon} Zburzono: ${BUILDING_PL[t].name}`;
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
  graphicsTitle: 'Graphics quality. Auto lowers it when the game runs slowly. Click to change.',
  graphics: (choice: string, level: string) => `🖥️ Graphics: ${choice === 'auto' ? `Auto (${level})` : level}`,
  levels: { low: 'Low', medium: 'Medium', high: 'High' },
  graphicsLowered: (level: string) => `The game was running slowly, so graphics are now ${level}. You can change this in the menu.`,
  sound: (muted: boolean): string => (muted ? '🔇 Sound: Off' : '🔊 Sound: On'),
  soundTitle: 'Wind, waves and music. Click or press M to mute.',
  music: (v: number): string => (v ? `🎵 Music: ${v * 100}%` : '🎵 Music: Off'),
  musicTitle: 'Music volume. Click to change. M mutes all sound.',
  pause: 'Pause (space)',
  help: 'Drag to pan · Scroll to zoom · B build · R road · X remove · Right-click to cancel · Ctrl+S save · M mute · F3 diagnostics',
  helpTouch: 'Drag to pan · Pinch to zoom · Tap twice to build',
  menu: 'Menu',
  done: '✋ Done',
  build: 'Build',
  buildTitle: 'Pick a building to place (B)',
  buildMenu: 'Build',
  buildIt: (name: string) => `🔨 Build ${name}`,
  close: 'Close (Esc)',
  groups: { wood: 'Wood', stone: 'Stone and ore', food: 'Food', town: 'Town' },
  road: 'Road',
  roadDesc: 'Click a flag or building, then where the road should go. Keeps going from the new end until you right-click.',
  remove: 'Remove',
  removeDesc: 'Remove a road, a lone flag, or a building. Its goods go back to the HQ.',
  key: (k: string) => `key ${k}`,
  settlers: (idle: number, busy: number) => `<b>${idle}</b> idle / ${busy} busy`,
  whyBuild: 'Why build it',
  whatNeeds: 'What it needs',
  costs: 'Costs',
  landRadius: (n: number) => `Land radius: ${n} tiles`,
  stored: 'Stored:',
  input: 'In:',
  ready: 'Ready:',
  born: (n: number, max: number) => `Settlers born here: ${n} / ${max}`,
  richSpot: '⭐ Next to a rich spot: digs twice as fast',
  goal: 'Goal',
  goalsDone: 'Every goal reached. Well done!',
  notLinked: 'Settlers cannot walk here from your HQ',
  welcome: 'Welcome! Place a woodcutter near some trees. It gets its own road to your HQ.',
  welcomeBack: (name: string) => `Welcome back to "${name}"! Your settlers are heading back to work.`,
  newIsland: 'A new island! Place a woodcutter near some trees. It gets its own road to your HQ.',
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
  graphicsTitle: 'Jakość grafiki. Tryb automatyczny obniża ją, gdy gra zwalnia. Kliknij, aby zmienić.',
  graphics: (choice: string, level: string) => `🖥️ Grafika: ${choice === 'auto' ? `auto (${level})` : level}`,
  levels: { low: 'niska', medium: 'średnia', high: 'wysoka' },
  graphicsLowered: (level: string) => `Gra zwalniała, więc grafika jest teraz ${level}. Możesz to zmienić w menu.`,
  sound: (muted: boolean): string => (muted ? '🔇 Dźwięk: wył.' : '🔊 Dźwięk: wł.'),
  soundTitle: 'Wiatr, fale i muzyka. Kliknij albo naciśnij M, aby wyciszyć.',
  music: (v: number): string => (v ? `🎵 Muzyka: ${v * 100}%` : '🎵 Muzyka: wył.'),
  musicTitle: 'Głośność muzyki. Kliknij, aby zmienić. M wycisza cały dźwięk.',
  pause: 'Pauza (spacja)',
  help: 'Przeciągnij, by przesunąć · Kółko przybliża · B buduj · R droga · X usuń · Prawy przycisk anuluje · Ctrl+S zapis · M wycisz · F3 diagnostyka',
  helpTouch: 'Przeciągnij: przesuń · Rozsuń palce: przybliż · Stuknij dwa razy: buduj',
  menu: 'Menu',
  done: '✋ Gotowe',
  build: 'Buduj',
  buildTitle: 'Wybierz budynek do postawienia (B)',
  buildMenu: 'Budowa',
  buildIt: (name: string) => `🔨 Postaw: ${name}`,
  close: 'Zamknij (Esc)',
  groups: { wood: 'Drewno', stone: 'Kamień i rudy', food: 'Żywność', town: 'Osada' },
  road: 'Droga',
  roadDesc: 'Kliknij flagę lub budynek, a potem miejsce, do którego ma biec droga. Droga biegnie dalej od nowego końca, aż klikniesz prawym przyciskiem.',
  remove: 'Usuń',
  removeDesc: 'Usuwa drogę, samotną flagę albo budynek. Jego towary wracają do siedziby.',
  key: (k: string) => `klawisz ${k}`,
  settlers: (idle: number, busy: number) => `<b>${idle}</b> ${plural(idle, 'wolny', 'wolni', 'wolnych')} / ${busy} przy pracy`,
  whyBuild: 'Po co budować',
  whatNeeds: 'Czego potrzebuje',
  costs: 'Koszt:',
  landRadius: (n: number) => `Zasięg ziem: ${n} ${plural(n, 'pole', 'pola', 'pól')}`,
  stored: 'W magazynie:',
  input: 'Wsad:',
  ready: 'Gotowe:',
  born: (n: number, max: number) => `Urodzeni tu osadnicy: ${n} / ${max}`,
  richSpot: '⭐ Obok bogatego złoża: wydobywa dwa razy szybciej',
  goal: 'Cel',
  goalsDone: 'Wszystkie cele osiągnięte. Brawo!',
  notLinked: 'Osadnicy nie dojdą tu z siedziby',
  welcome: 'Witaj! Postaw chatę drwala blisko drzew. Sama dostanie drogę do siedziby.',
  welcomeBack: (name: string) => `Witaj z powrotem w „${name}”! Twoi osadnicy wracają do pracy.`,
  newIsland: 'Nowa wyspa! Postaw chatę drwala blisko drzew. Sama dostanie drogę do siedziby.',
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
