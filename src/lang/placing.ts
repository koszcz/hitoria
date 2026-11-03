// Why a building can't go here, in Polish. The English reasons live with the rules, in src/game/construction.ts.
import { CUTS_OFF } from '../game/cutoff';

export const PLACING_PL: Record<string, string> = {
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
  'In front of the door of another building': 'Przed drzwiami innego budynku',
  'No room in front of its door': 'Brak miejsca przed drzwiami',
  'Settlers cannot walk there': 'Osadnicy tu nie dojdą',
  'No room for its fields': 'Brak miejsca na pola',
  'This is a farm field': 'Tu jest pole farmy',
  'Unknown building': 'Nieznany budynek',
  [CUTS_OFF]: 'To odetnie inny budynek od twojej siedziby',
};
