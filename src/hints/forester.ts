// The placement hint shown while you place a building on a forester's planting ground.
import { getLang } from '../i18n';

const EN = "🌱 Takes room from a Forester's Hut. It plants fewer trees here";
const PL = '🌱 Zabiera miejsce Chacie leśnika. Posadzi tu mniej drzew';

export const foresterRoomHint = () => (getLang() === 'pl' ? PL : EN);
