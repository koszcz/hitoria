// Building names and descriptions in Polish. The English ones live with the buildings, in src/game/defs.ts.
import { HOUSE_GROW, HOUSE_SIZE, type BType } from '../game';

export const BUILDING_PL: Record<BType, { name: string; desc: string }> = {
  hq: { name: 'Siedziba', desc: 'Przechowuje wszystkie towary i daje dach wolnym osadnikom.' },
  woodcutter: { name: 'Chata drwala', desc: 'Ścina dorosłe drzewa w pobliżu i dostarcza kłody.' },
  forester: { name: 'Chata leśnika', desc: 'Sadzi sadzonki, z których wyrastają nowe drzewa.' },
  quarry: { name: 'Kamieniołom', desc: 'Rozbija pobliskie głazy na kamień.' },
  sawmill: { name: 'Tartak', desc: 'Tnie kłody na deski.' },
  lookout: { name: 'Wieża widokowa', desc: 'Poszerza twoje ziemie. Żadnych żołnierzy, tylko widok.' },
  storehouse: { name: 'Magazyn', desc: 'Przechowuje zapasy blisko miejsc, w których się je wytwarza i zużywa.' },
  harbour: {
    name: 'Port',
    desc: 'Drewniane molo na brzegu, przy którym mogą cumować statki. Przechowuje towary jak magazyn. Zbuduj go przy otwartej wodzie.',
  },
  fisher: { name: 'Chata rybaka', desc: 'Łowi ryby w pobliskiej wodzie. Zbuduj ją blisko brzegu.' },
  hunter: { name: 'Chata myśliwego', desc: 'Poluje na jelenie i zające w pobliżu i przynosi mięso. Zwierzęta powoli wracają.' },
  farm: { name: 'Gospodarstwo', desc: 'Sieje zboże na wolnej trawie w pobliżu i zbiera je, gdy dojrzeje.' },
  well: { name: 'Studnia', desc: 'Czerpie wodę z ziemi. Zbuduj ją na dowolnej płaskiej trawie.' },
  mill: { name: 'Młyn', desc: 'Miele zboże na mąkę.' },
  bakery: { name: 'Piekarnia', desc: 'Piecze chleb z mąki i wody.' },
  mine: {
    name: 'Kopalnia kamienia',
    desc: 'Wydobywa kamień z góry i nigdy się nie wyczerpuje. Górnik zjada jedną rybę, porcję mięsa lub bochenek chleba na każde 2 kamienie. Zbuduj ją przy górze.',
  },
  coalmine: {
    name: 'Kopalnia węgla',
    desc: 'Wydobywa węgiel z góry i nigdy się nie wyczerpuje. Górnik zjada jedną rybę, porcję mięsa lub bochenek chleba na każde 2 worki węgla. Węgiel jest tylko w górach drugiej wyspy, więc zbuduj ją tam.',
  },
  toolmaker: {
    name: 'Warsztat narzędziarza',
    desc: 'Robi narzędzia, których potrzebują nowi pracownicy, z żelaza i desek. Na każde narzędzie zużywa 1 sztabkę żelaza i 1 deskę.',
  },
  geologist: {
    name: 'Chata geologa',
    desc: 'Geolog bada pobliskie góry i stawia znak na każdym polu. Złoty znak oznacza bogate złoże: kopalnia obok niego wydobywa dwa razy szybciej. Zbuduj ją przy górze.',
  },
  smelter: { name: 'Huta', desc: 'Wytapia żelazo z rudy żelaza i węgla. Na każdą sztabkę żelaza zużywa 1 bryłę rudy i 1 worek węgla.' },
  ironmine: {
    name: 'Kopalnia żelaza',
    desc: 'Wydobywa rudę żelaza z góry i nigdy się nie wyczerpuje. Górnik zjada jedną rybę, porcję mięsa lub bochenek chleba na każde 2 bryły rudy. Ruda żelaza jest tylko w górach drugiej wyspy, więc zbuduj ją tam.',
  },
  monument: {
    name: 'Pomnik',
    desc: 'Wysoki kamienny pomnik twojej spokojnej wyspy. Nie wykonuje żadnej pracy, ale osadnicy są z niego dumni.',
  },
  house: {
    name: 'Dom',
    desc: `Dom rodzinny. Co ${HOUSE_GROW} s zamienia jedną rybę, porcję mięsa lub bochenek chleba w nowego osadnika, najwyżej ${HOUSE_SIZE} osadników.`,
  },
};
