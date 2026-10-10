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

/**
 * Valores do filtro «Elemento» de uma carta: os seus tipos de energia (Fire, Water…). As cartas sem tipo são
 * classificadas pela categoria (Energy, Trainer); só se nem isso houver ficam em «(sem dados)».
 */
export function elementKeys(c: Pick<CardRow, "types" | "supertype">): string[] {
  const types = splitList(c.types);
  if (types.length) return types;
  const st = c.supertype.trim().toLowerCase();
  if (st === "energy") return ["Energy"];
  if (st === "trainer") return ["Trainer"];
  return [NONE];
}

const CATEGORY_LABELS: Record<string, string> = { Energy: "Energia", Trainer: "Treinador" };
export const elementLabel = (v: string): string => CATEGORY_LABELS[v] ?? energyInfo(v).label;

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

const elementSort = (a: string, b: string) => {
  const rank = (v: string) => (v in CATEGORY_LABELS ? 1 : 0);
  return rank(a) - rank(b) || elementLabel(a).localeCompare(elementLabel(b), "pt");
};

type Facet = keyof CardFilters;

/** Valores que cada carta tem em cada filtro. */
function facetValues(c: CardRow): Record<Facet, string[]> {
  const st = splitList(c.subtypes);
  return {
    pokemon: [speciesOf(c)],
    stage: st.length ? st : [NONE],
    element: elementKeys(c),
    rarity: [c.rarity?.trim() || NONE],
    artist: [c.artist?.trim() || NONE],
  };
}

/**
 * Opções de cada filtro, calculadas só a partir das cartas do set e **condicionadas pelos outros filtros**:
 * cada lista mostra apenas o que ainda existe nas cartas que cumprem os restantes filtros, com a contagem
 * correspondente. O valor já escolhido nunca desaparece da sua lista (fica com 0 se deixar de haver cartas).
 */
export function filterOptions(cards: CardRow[], filters: CardFilters = NO_FILTERS) {
  const build = (facet: Facet, sort: (a: string, b: string) => number, label?: (v: string) => string): Option[] => {
    const pool = applyCardFilters(cards, { ...filters, [facet]: "" });
    const m = tally(pool.map((c) => facetValues(c)[facet]));
    if (filters[facet] && !m.has(filters[facet])) m.set(filters[facet], 0);
    return toOptions(m, sort, label);
  };
  return {
    pokemon: build("pokemon", (a, b) => a.localeCompare(b, "pt")),
    stage: build("stage", byOrder(STAGE_ORDER)),
    element: build("element", elementSort, elementLabel),
    rarity: build("rarity", byOrder(RARITY_ORDER)),
    artist: build("artist", (a, b) => a.localeCompare(b, "en")),
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
    if (f.element && !elementKeys(c).includes(f.element)) return false;
    if (f.rarity && (c.rarity?.trim() || NONE) !== f.rarity) return false;
    if (f.artist && (c.artist?.trim() || NONE) !== f.artist) return false;
    return true;
  });
}
