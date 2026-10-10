import { energyInfo } from "./energy";
import { speciesOf } from "./species";
import type { CardRow } from "./types";

export type CardFilters = {
  pokemon: string;
  stage: string;
  element: string;
  rarity: string;
  artist: string;
};

export const NO_FILTERS: CardFilters = { pokemon: "", stage: "", element: "", rarity: "", artist: "" };

export type Option = { value: string; label: string; count: number };

/** Valor usado para cartas sem esse dado (ex.: Energias sem raridade). */
export const NONE = "__none__";

/** "Stage 2, MEGA, ex" -> ["Stage 2", "MEGA", "ex"] */
export const splitList = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);

// Da mais comum para a mais rara; o que não estiver aqui vai para o fim, por ordem alfabética.
const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Double Rare", "Illustration Rare", "Ultra Rare", "ACE SPEC Rare",
  "Shiny Rare", "Shiny Ultra Rare", "Special Illustration Rare", "Mega Hyper Rare", "Hyper Rare", "Promo",
];

const STAGE_ORDER = ["Basic", "Stage 1", "Stage 2", "MEGA", "VMAX", "VSTAR", "V", "ex", "EX", "GX"];

function tally(values: string[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const list of values) for (const v of new Set(list)) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

const byOrder = (order: string[]) => (a: string, b: string) => {
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
  return a.localeCompare(b, "en");
};

function toOptions(m: Map<string, number>, sort: (a: string, b: string) => number, label: (v: string) => string = (v) => v): Option[] {
  return [...m.keys()].filter((v) => v !== NONE).sort(sort).map((value) => ({ value, label: label(value), count: m.get(value)! }))
    .concat(m.has(NONE) ? [{ value: NONE, label: "(sem dados)", count: m.get(NONE)! }] : []);
}

/** Opções de cada filtro, calculadas só a partir das cartas do set (com a contagem de cartas de cada uma). */
export function filterOptions(cards: CardRow[]) {
  const pokemon = tally(cards.map((c) => [speciesOf(c)]));
  const stage = tally(cards.map((c) => (splitList(c.subtypes).length ? splitList(c.subtypes) : [NONE])));
  const element = tally(cards.map((c) => (splitList(c.types).length ? splitList(c.types) : [NONE])));
  const rarity = tally(cards.map((c) => [c.rarity?.trim() || NONE]));
  const artist = tally(cards.map((c) => [c.artist?.trim() || NONE]));
  return {
    pokemon: toOptions(pokemon, (a, b) => a.localeCompare(b, "pt")),
    stage: toOptions(stage, byOrder(STAGE_ORDER)),
    element: toOptions(element, (a, b) => energyInfo(a).label.localeCompare(energyInfo(b).label, "pt"), (v) => energyInfo(v).label),
    rarity: toOptions(rarity, byOrder(RARITY_ORDER)),
    artist: toOptions(artist, (a, b) => a.localeCompare(b, "en")),
  };
}

export const activeFilterCount = (f: CardFilters): number => Object.values(f).filter(Boolean).length;

/** Filtros combinados (E): a carta tem de cumprir todos os que estiverem escolhidos. */
export function applyCardFilters(cards: CardRow[], f: CardFilters): CardRow[] {
  return cards.filter((c) => {
    if (f.pokemon && speciesOf(c) !== f.pokemon) return false;
    if (f.stage) {
      const st = splitList(c.subtypes);
      if (f.stage === NONE ? st.length > 0 : !st.includes(f.stage)) return false;
    }
    if (f.element) {
      const ty = splitList(c.types);
      if (f.element === NONE ? ty.length > 0 : !ty.includes(f.element)) return false;
    }
    if (f.rarity && (c.rarity?.trim() || NONE) !== f.rarity) return false;
    if (f.artist && (c.artist?.trim() || NONE) !== f.artist) return false;
    return true;
  });
}
