import { test } from "node:test";
import assert from "node:assert/strict";
import { speciesFromName, speciesOf } from "../src/lib/species";
import { buildRows, filterAndSort } from "../src/lib/grouping";
import { readFileSync } from "node:fs";
import { buildNameQuery, EMPTY_CARD_TEXT, numberSortKey, staticToCardRow, toCardRow, toCardText, toSetRow } from "../src/lib/mappers";
import { defaultDir, hpValue, sortCards } from "../src/lib/card-sort";
import { activeFilterCount, applyCardFilters, filterOptions, NO_FILTERS, NONE } from "../src/lib/card-filters";
import { energyInfo, hasCardText } from "../src/lib/energy";
import { cardmarketLink, tcgplayerLink } from "../src/lib/market-links";
import { filterSets, seriesOptions, yearOptions } from "../src/lib/sets-filter";
import { clampInt, formatCode, generateCode, inviteState, normalizeCode } from "../src/lib/invite";
import { isAdminEmail, parseAdminEmails, validateNewUser, validatePassword } from "../src/lib/admin-rules";
import { normalizeNumber, pickTcgdexSet } from "../src/lib/tcgdex-rules";
import { describeHttpFailure } from "../src/lib/http-errors";
import { isDark, nextPref, parsePref, THEME_INIT_SCRIPT } from "../src/lib/theme";
import { setNeedsSync } from "../src/lib/sync-rules";
import { cardPrice, referencePrice, type CardRow, type OwnedCard } from "../src/lib/types";

test("speciesFromName", () => {
  const cases: Record<string, string> = {
    "Mega Darkrai ex": "Darkrai",
    "Team Rocket's Mewtwo ex": "Mewtwo",
    "M Charizard-EX": "Charizard",
    "Pikachu VMAX": "Pikachu",
    "Charizard V": "Charizard",
    "Dark Charizard": "Charizard",
    "Mr. Mime": "Mr. Mime",
    "Radiant Greninja": "Greninja",
    Pikachu: "Pikachu",
    V: "V",
    "Farfetch'd": "Farfetch'd",
    "Charizard ★": "Charizard",
    "Lt. Surge's Raichu": "Raichu",
    "Mewtwo V-UNION": "Mewtwo",
    "Blastoise ex (Tera)": "Blastoise",
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(speciesFromName(input), expected, input);
  assert.equal(speciesOf({ name: "Boss's Orders", supertype: "Trainer" }), "Treinadores");
  assert.equal(speciesOf({ name: "Fire Energy", supertype: "Energy" }), "Energias");
});

test("buildNameQuery / numberSortKey", () => {
  assert.equal(buildNameQuery("Mr. Mime"), "name:Mr* name:Mime*");
  assert.equal(buildNameQuery("  "), null);
  assert.equal(buildNameQuery('Pikachu "V"'), "name:Pikachu* name:V*");
  assert.equal(numberSortKey("SWSH001"), 1);
  assert.equal(numberSortKey("TG05"), 5);
  assert.equal(numberSortKey("x"), 0);
});

test("toCardRow maps Cardmarket prices; zeros count as missing", () => {
  const row = toCardRow({
    id: "me3-116",
    name: "Mega Darkrai ex",
    number: "116",
    set: { id: "me3", name: "Pitch Black" },
    images: { small: "s", large: "l" },
    cardmarket: { url: "u", updatedAt: "2026/10/02", prices: { trendPrice: 188.3, avg30: 216.41, lowPrice: 0, avg1: 0 } },
  });
  assert.equal(row.trend, 188.3);
  assert.equal(row.low, null);
  assert.equal(row.avg1, null);
  assert.equal(row.price_source, "pokemontcg");
  const empty = toCardRow({ id: "x", cardmarket: { prices: { trendPrice: 0 } } });
  assert.equal(cardPrice(empty), null);
  assert.equal(empty.price_source, null);
});

function card(partial: Partial<CardRow>): CardRow {
  return {
    id: "id", name: "n", set_id: "s", set_name: "S", number: "1", number_sort: 1, supertype: "Pokémon", subtypes: "",
    hp: null, types: "", rarity: null, artist: null, image_small: "", image_large: "", cm_url: null, cm_updated_at: null,
    trend: null, avg_sell: null, low: null, avg1: null, avg7: null, avg30: null, reverse_trend: null, price_source: null,
    fetched_at: "2026-01-01T00:00:00Z", ...partial,
  };
}
const owned = (c: Partial<CardRow>, quantity = 1, addedAt = "2026-01-01"): OwnedCard => ({ card: card(c), quantity, wishlist: false, addedAt });

test("grouping by set / pokemon with collapse and value order", () => {
  const items = [
    owned({ id: "a", name: "Mega Darkrai ex", set_id: "me3", set_name: "Pitch Black", trend: 190 }, 1, "2026-02-01"),
    owned({ id: "b", name: "Darkrai V", set_id: "swsh9", set_name: "Brilliant Stars", trend: 5 }, 2, "2026-03-01"),
    owned({ id: "c", name: "Pikachu", set_id: "swsh9", set_name: "Brilliant Stars", trend: 1 }, 1, "2026-01-01"),
  ];
  const bySet = buildRows(filterAndSort(items, "", "value"), "set", "value", new Set(), false);
  const headers = bySet.filter((r) => r.kind === "header");
  assert.deepEqual(headers.map((h) => h.kind === "header" && h.label), ["Pitch Black", "Brilliant Stars"]);
  assert.equal(headers[1].kind === "header" && headers[1].value, 5 * 2 + 1);

  const byPoke = buildRows(filterAndSort(items, "", "name"), "pokemon", "name", new Set(), false);
  const h2 = byPoke.filter((r) => r.kind === "header");
  assert.deepEqual(h2.map((h) => h.kind === "header" && [h.label, h.cards]), [["Darkrai", 3], ["Pikachu", 1]]);

  const collapsed = buildRows(items, "pokemon", "name", new Set(["darkrai"]), false);
  assert.equal(collapsed.filter((r) => r.kind === "item").length, 1);
  assert.equal(buildRows(items, "none", "name", new Set(), false).every((r) => r.kind === "item"), true);
  assert.equal(filterAndSort(items, "pitch", "name").length, 1);
});

test("setNeedsSync", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  assert.equal(setNeedsSync(0, 100, null, now), true);
  assert.equal(setNeedsSync(50, 100, "2026-10-10T11:00:00Z", now), true);
  assert.equal(setNeedsSync(100, 100, "2026-10-10T11:00:00Z", now), false);
  assert.equal(setNeedsSync(100, 100, "2026-10-08T11:00:00Z", now), true);
});

test("admin rules", () => {
  assert.deepEqual(parseAdminEmails(" A@x.com, b@y.com ,, "), ["a@x.com", "b@y.com"]);
  assert.equal(isAdminEmail("A@X.com", "a@x.com"), true);
  assert.equal(isAdminEmail("c@x.com", "a@x.com"), false);
  assert.equal(isAdminEmail(null, "a@x.com"), false);
  assert.equal(isAdminEmail("a@x.com", ""), false);
  assert.equal(validateNewUser("nope", "12345678"), "Email inválido.");
  assert.match(validateNewUser("a@x.com", "123") ?? "", /pelo menos 8/);
  assert.equal(validateNewUser("a@x.com", "12345678"), null);
});

test("invite codes", () => {
  const c = generateCode();
  assert.match(c, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
  assert.notEqual(generateCode(), generateCode());
  assert.equal(normalizeCode(" k7m2p-x9qrt "), "K7M2PX9QRT");
  assert.equal(formatCode("K7M2PX9QRT"), "K7M2P-X9QRT");
  assert.equal(normalizeCode(formatCode(c)), c);
  const now = Date.parse("2026-10-12T00:00:00Z");
  assert.equal(inviteState({ uses: 0, max_uses: 1, expires_at: null }, now), "ativo");
  assert.equal(inviteState({ uses: 1, max_uses: 1, expires_at: null }, now), "esgotado");
  assert.equal(inviteState({ uses: 0, max_uses: 1, expires_at: "2026-10-11T00:00:00Z" }, now), "expirado");
  assert.equal(clampInt("99", 1, 50, 1), 50);
  assert.equal(clampInt("abc", 1, 50, 7), 7);
  assert.equal(clampInt(null, 0, 365, 7), 7);
});

test("validatePassword", () => {
  assert.match(validatePassword("123") ?? "", /pelo menos 8/);
  assert.equal(validatePassword("12345678"), null);
  assert.equal(validatePassword("12345678", "12345678"), null);
  assert.equal(validatePassword("12345678", "12345679"), "As passwords não coincidem.");
});

test("pickTcgdexSet / normalizeNumber", () => {
  const list = [
    { id: "me03", name: "Pitch Black", cardCount: { official: 88 } },
    { id: "sv03.5", name: "151", cardCount: { official: 165 } },
    { id: "x1", name: "Other", cardCount: { official: 88 } },
  ];
  assert.equal(pickTcgdexSet(list, "Pitch Black", 0), "me03");
  assert.equal(pickTcgdexSet(list, "Scarlet & Violet—151", 165), "sv03.5"); // pelo n.º oficial (único)
  assert.equal(pickTcgdexSet(list, "Desconhecido", 88), null); // 2 sets com 88: ambíguo
  assert.equal(pickTcgdexSet(list, "Desconhecido", 0), null);
  assert.equal(normalizeNumber("012"), "12");
  assert.equal(normalizeNumber("SWSH001"), "swsh001");
});

test("theme preference", () => {
  assert.equal(parsePref("dark"), "dark");
  assert.equal(parsePref("light"), "light");
  assert.equal(parsePref("qualquer"), "system");
  assert.equal(parsePref(null), "system");
  assert.equal(isDark("system", true), true);
  assert.equal(isDark("system", false), false);
  assert.equal(isDark("light", true), false);
  assert.equal(isDark("dark", false), true);
  assert.deepEqual(["system", "light", "dark"].map((p) => nextPref(p as "system")), ["light", "dark", "system"]);
});

test("theme init script matches isDark for every preference", () => {
  const run = (stored: string | null, systemDark: boolean) => {
    let dark: boolean | null = null;
    const g = globalThis as unknown as Record<string, unknown>;
    const saved = { localStorage: g.localStorage, window: g.window, document: g.document };
    g.localStorage = { getItem: () => stored };
    g.window = { matchMedia: () => ({ matches: systemDark }) };
    g.document = { documentElement: { classList: { toggle: (_: string, v: boolean) => (dark = v) } } };
    try {
      new Function(THEME_INIT_SCRIPT)();
    } finally {
      Object.assign(g, saved);
    }
    return dark;
  };
  for (const stored of [null, "light", "dark", "xyz"]) {
    for (const sys of [true, false]) {
      assert.equal(run(stored, sys), isDark(parsePref(stored), sys), `${stored}/${sys}`);
    }
  }
});

test("describeHttpFailure never leaks HTML", () => {
  const html = '<!DOCTYPE html> <!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US">';
  assert.equal(
    describeHttpFailure("Pokémon TCG API", 502, html),
    "Pokémon TCG API: servidor indisponível ou sobrecarregado (HTTP 502)",
  );
  assert.equal(describeHttpFailure("X", 429, ""), "X: demasiados pedidos (HTTP 429)");
  assert.equal(describeHttpFailure("X", 404, '{"error":"not found"}'), 'X: HTTP 404 ({"error":"not found"})');
  assert.equal(describeHttpFailure("X", 500, html), "X: HTTP 500");
});

test("reference price is the 30-day average; 'From' (low) is never the value", () => {
  const base = { avg30: null, avg7: null, trend: null, avg_sell: null, reverse_trend: null };
  assert.deepEqual(referencePrice({ ...base, avg30: 216.41, trend: 188.3 }), { value: 216.41, basis: "avg30" });
  assert.deepEqual(referencePrice({ ...base, avg7: 194.83, trend: 188.3 }), { value: 194.83, basis: "avg7" });
  assert.deepEqual(referencePrice({ ...base, trend: 188.3 }), { value: 188.3, basis: "trend" });
  assert.deepEqual(referencePrice({ ...base, avg_sell: 181.62 }), { value: 181.62, basis: "avg_sell" });
  assert.deepEqual(referencePrice({ ...base, avg30: 0, trend: 5 }), { value: 5, basis: "trend" });
  assert.equal(cardPrice({ ...base, ...({ low: 144 } as object) }), null); // só «From» => sem valor
  const row = toCardRow({ id: "x", cardmarket: { prices: { lowPrice: 144 } } });
  assert.equal(row.low, 144);
  assert.equal(row.price_source, null);
});

test("market links", () => {
  assert.deepEqual(cardmarketLink({ cm_url: "https://prices.pokemontcg.io/cardmarket/base1-4", name: "Charizard" }), {
    url: "https://prices.pokemontcg.io/cardmarket/base1-4",
    direct: true,
  });
  assert.deepEqual(cardmarketLink({ cm_url: null, name: "Mega Darkrai ex" }), {
    url: "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=Mega%20Darkrai%20ex",
    direct: false,
  });
  assert.equal(
    tcgplayerLink({ name: "Mr. Mime" }),
    "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=Mr.%20Mime&view=grid",
  );
});

// Amostras REAIS do repositório PokemonTCG/pokemon-tcg-data (ficheiros estáticos usados como catálogo).
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

test("static catalogue: cards map like API cards (same ids, no prices)", () => {
  const cards = fixture("me5-sample.json");
  const rows = cards.map((c: never) => staticToCardRow(c, { id: "me5", name: "Pitch Black" }, new Date("2026-10-12")));
  const darkrai = rows.find((r: CardRow) => r.number === "116");
  assert.equal(darkrai.id, "me5-116");
  assert.equal(darkrai.name, "Mega Darkrai ex");
  assert.equal(darkrai.set_id, "me5");
  assert.equal(darkrai.set_name, "Pitch Black");
  assert.equal(darkrai.rarity, "Special Illustration Rare");
  assert.equal(darkrai.number_sort, 116);
  assert.match(darkrai.image_small, /^https:\/\//); // sets recentes usam images.scrydex.com
  assert.equal(cardPrice(darkrai), null); // sem preços: vêm da API / TCGdex
  assert.equal(darkrai.price_source, null);
});

test("static catalogue: sets map, including null printedTotal", () => {
  const sets = fixture("sets-sample.json").map(toSetRow);
  const me5 = sets.find((s: { id: string }) => s.id === "me5");
  assert.deepEqual([me5.name, me5.total, me5.printed_total, me5.release_date], ["Pitch Black", 120, 84, "2026/07/17"]);
  assert.equal(sets.find((s: { id: string }) => s.id === "me55c").printed_total, 0);
});

test("sets filters: series, year, text (name + series), owned", () => {
  const sets = (fixture("sets-sample.json") as never[]).map(toSetRow);
  const extra = [
    { id: "sv1", name: "Scarlet & Violet", series: "Scarlet & Violet", release_date: "2023/03/31" },
    { id: "sv2", name: "Paldea Evolved", series: "Scarlet & Violet", release_date: "2023/06/09" },
    { id: "ex1", name: "Ruby & Sapphire", series: "EX", release_date: "2003/06/18" },
  ].map((s) => ({ ...s, printed_total: 0, total: 0, logo_url: "", symbol_url: "" }));
  const all = [...sets, ...extra];
  const none = { query: "", series: "", year: "", onlyOwned: false };

  assert.deepEqual(yearOptions(all), ["2026", "2023", "2003", "1999"]);
  assert.deepEqual(seriesOptions(all)[0], "Mega Evolution"); // série do set mais recente primeiro
  assert.ok(seriesOptions(all).includes("EX") && seriesOptions(all).includes("Base"));

  assert.equal(filterSets(all, none, {}).length, all.length);
  assert.deepEqual(filterSets(all, { ...none, year: "2023" }, {}).map((s) => s.id).sort(), ["sv1", "sv2"]);
  assert.deepEqual(filterSets(all, { ...none, series: "EX" }, {}).map((s) => s.id), ["ex1"]);
  // o texto procura no nome do set e também na série
  assert.deepEqual(filterSets(all, { ...none, query: "paldea" }, {}).map((s) => s.id), ["sv2"]);
  assert.deepEqual(filterSets(all, { ...none, query: "scarlet" }, {}).map((s) => s.id).sort(), ["sv1", "sv2"]);
  assert.deepEqual(filterSets(all, { ...none, year: "2023", query: "evolved" }, {}).map((s) => s.id), ["sv2"]);
  assert.deepEqual(filterSets(all, { ...none, onlyOwned: true }, { sv2: 3 }).map((s) => s.id), ["sv2"]);
});

test("card text from real catalogue data (Pokémon, Trainer, Energy)", () => {
  const cards = fixture("text-sample.json") as never[];
  const rows = cards.map((c) => staticToCardRow(c, { id: "x", name: "X" }, new Date("2026-10-12")));
  const by = (id: string) => rows.find((r: CardRow) => r.id === id)!;

  const greninja = by("me4-122").card_text!;
  assert.equal(greninja.abilities[0].name, "Mortal Shuriken");
  assert.match(greninja.abilities[0].text, /Place 6 damage counters/);
  assert.deepEqual(greninja.attacks[0].cost, ["Water", "Water"]);
  assert.equal(greninja.attacks[0].damage, "120+");
  assert.deepEqual(greninja.weaknesses, [{ type: "Lightning", value: "×2" }]);
  assert.deepEqual(greninja.retreat, ["Colorless"]);
  assert.match(greninja.rules[0], /Mega Evolution ex Rule/);
  assert.equal(greninja.evolvesFrom, "Frogadier");
  assert.ok(hasCardText(greninja));

  const charizard = by("base1-4").card_text!;
  assert.deepEqual(charizard.resistances, [{ type: "Fighting", value: "-30" }]);
  assert.ok(charizard.flavor && charizard.flavor.length > 10);

  const trainer = by("me5-72").card_text!;
  assert.ok(trainer.rules.length > 0 && trainer.attacks.length === 0);

  // sem campos de texto: da API fica null (não apaga o que existe); do catálogo estático fica «carregado, vazio»
  assert.equal(toCardText({ id: "x" }), null);
  assert.deepEqual(staticToCardRow({ id: "x" }, { id: "s", name: "S" }).card_text, EMPTY_CARD_TEXT);
  assert.equal(hasCardText(EMPTY_CARD_TEXT), false);
  assert.equal(hasCardText(null), false);
});

test("energy chips", () => {
  assert.equal(energyInfo("Water").letter, "W");
  assert.equal(energyInfo("Colorless").letter, "C");
  assert.equal(energyInfo("Darkness").label, "Escuridão");
  assert.equal(energyInfo("Estranha").letter, "E"); // desconhecido: usa a inicial
});

test("set filters on a real set (Chaos Rising, 122 cards): options, counts and combinations", () => {
  const rows: CardRow[] = (fixture("me4-filters.json") as never[]).map((c) =>
    staticToCardRow(c, { id: "me4", name: "Chaos Rising" }, new Date("2026-10-12")),
  );
  assert.equal(rows.length, 122);
  const o = filterOptions(rows);
  const count = (list: { value: string; count: number }[], v: string) => list.find((x) => x.value === v)?.count;

  // contagens calculadas à parte (em Python) a partir do mesmo ficheiro de dados
  assert.equal(count(o.rarity, "Common"), 38);
  assert.equal(count(o.rarity, "Special Illustration Rare"), 6);
  assert.equal(count(o.rarity, "Mega Hyper Rare"), 1);
  assert.equal(count(o.rarity, NONE), undefined); // todas as cartas deste set têm raridade
  assert.deepEqual(o.rarity.slice(0, 3).map((x) => x.value), ["Common", "Uncommon", "Rare"]); // do mais comum para o mais raro
  assert.equal(o.rarity.at(-1)!.value, "Mega Hyper Rare");

  assert.equal(count(o.stage, "Basic"), 46);
  assert.equal(count(o.stage, "Stage 2"), 16);
  assert.equal(count(o.stage, "MEGA"), 13);
  assert.equal(count(o.stage, "Supporter"), 10);
  assert.deepEqual(o.stage.slice(0, 3).map((x) => x.value), ["Basic", "Stage 1", "Stage 2"]);

  assert.equal(count(o.element, "Water"), 16);
  // as cartas sem tipo são classificadas pela categoria: 22 Treinadores + 3 Energias (nenhuma fica «sem dados»)
  assert.equal(count(o.element, "Trainer"), 22);
  assert.equal(count(o.element, "Energy"), 3);
  assert.equal(count(o.element, NONE), undefined);
  assert.equal(o.element.find((x) => x.value === "Water")!.label, "Água");
  assert.equal(o.element.find((x) => x.value === "Trainer")!.label, "Treinador");
  assert.equal(o.element.find((x) => x.value === "Energy")!.label, "Energia");
  assert.deepEqual(o.element.slice(-2).map((x) => x.value), ["Energy", "Trainer"]); // categorias depois dos tipos

  assert.equal(o.artist.filter((x) => x.value !== NONE).length, 83);
  assert.equal(count(o.artist, "5ban Graphics"), 11);
  assert.equal(count(o.artist, NONE), 3);
  assert.equal(count(o.pokemon, "Greninja"), 4); // as 4 versões da Mega Greninja ex, agrupadas na espécie

  const f = (patch: Partial<typeof NO_FILTERS>) => applyCardFilters(rows, { ...NO_FILTERS, ...patch });
  assert.equal(f({}).length, 122);
  assert.equal(f({ rarity: "Special Illustration Rare" }).length, 6);
  assert.equal(f({ element: "Water" }).length, 16);
  assert.equal(f({ element: "Water", stage: "Stage 2" }).length, 4); // filtros combinam-se (E)
  assert.equal(f({ element: "Trainer" }).length, 22);
  assert.equal(f({ element: "Energy" }).length, 3);
  assert.equal(f({ element: NONE }).length, 0);
  assert.equal(f({ pokemon: "Greninja" }).length, 4);
  assert.equal(f({ pokemon: "Greninja", rarity: "Mega Hyper Rare" }).length, 1);
  assert.equal(f({ artist: "5ban Graphics" }).length, 11);
  assert.equal(f({ artist: NONE }).length, 3);
  assert.equal(f({ pokemon: "Greninja", rarity: "Common" }).length, 0);
  assert.equal(activeFilterCount({ ...NO_FILTERS, rarity: "x", artist: "y" }), 2);

  // Filtros condicionados entre si (valores calculados à parte a partir dos mesmos dados)
  const values = (list: { value: string }[]) => list.map((x) => x.value).sort();
  const sir = filterOptions(rows, { ...NO_FILTERS, rarity: "Special Illustration Rare" });
  assert.deepEqual(values(sir.element), ["Colorless", "Dragon", "Psychic", "Trainer", "Water"]);
  assert.equal(count(sir.element, "Trainer"), 2);
  assert.equal(count(sir.element, "Water"), 1);
  assert.deepEqual(values(sir.artist), ["Kazumasa Yasukunio", "Keisin", "OKACHEKE", "Susumu Maeya", "Teeziro", "Tomowaka"]);
  assert.equal(count(sir.stage, "Supporter"), 2);
  assert.equal(count(sir.stage, "Basic"), 1);
  // a lista do próprio filtro NÃO é condicionada por ele mesmo (pode trocar de raridade)
  assert.equal(count(sir.rarity, "Common"), 38);

  const gren = filterOptions(rows, { ...NO_FILTERS, pokemon: "Greninja" });
  assert.deepEqual(values(gren.rarity), ["Double Rare", "Mega Hyper Rare", "Special Illustration Rare", "Ultra Rare"]);
  assert.deepEqual(values(gren.artist), ["Susumu Maeya", "takuyoa"]);
  assert.deepEqual(values(gren.element), ["Water"]);

  const water = filterOptions(rows, { ...NO_FILTERS, element: "Water" });
  assert.equal(count(water.rarity, "Common"), 6);
  assert.equal(count(water.rarity, "Mega Hyper Rare"), 1);
  assert.equal(count(water.rarity, "Ultra Rare"), 1);

  // o valor escolhido nunca desaparece da sua lista, mesmo que a combinação dê 0 cartas
  const impossible = filterOptions(rows, { ...NO_FILTERS, pokemon: "Greninja", rarity: "Common" });
  assert.equal(count(impossible.rarity, "Common"), 0);
  assert.equal(count(impossible.pokemon, "Greninja"), 0);
});

test("sort by HP and value, ascending/descending, missing data always last", () => {
  const rows: CardRow[] = (fixture("me4-filters.json") as never[]).map((c) =>
    staticToCardRow(c, { id: "me4", name: "Chaos Rising" }, new Date("2026-10-12")),
  );
  const num = (r: CardRow) => r.number_sort;

  // HP (valores calculados à parte nos mesmos dados): 97 cartas com HP, 25 sem; máximo 350, mínimo 40
  const desc = sortCards(rows, "hp", "desc");
  assert.deepEqual(desc.slice(0, 3).map((r) => [hpValue(r), r.number]), [[350, "22"], [350, "48"], [350, "100"]]); // empate: por número
  assert.equal(hpValue(desc[96]), 40);
  assert.equal(desc.slice(97).every((r) => hpValue(r) == null), true); // sem HP no fim (Treinadores e Energias)
  const asc = sortCards(rows, "hp", "asc");
  assert.deepEqual(asc.slice(0, 3).map((r) => [hpValue(r), r.number]), [[40, "49"], [50, "1"], [60, "36"]]);
  assert.equal(asc.slice(97).every((r) => hpValue(r) == null), true); // também no fim em ascendente

  // Número e Nome
  assert.deepEqual(sortCards(rows, "number", "asc").slice(0, 3).map(num), [1, 2, 3]);
  assert.deepEqual(sortCards(rows, "number", "desc").slice(0, 2).map(num), [122, 121]);
  assert.equal(sortCards(rows, "name", "asc")[0].name.localeCompare(sortCards(rows, "name", "asc")[1].name, "pt") <= 0, true);

  // Valor (a média de 30 dias; os preços vêm de outra fonte, por isso uso valores de teste)
  const priced = rows.slice(0, 5).map((r, i) => ({ ...r, avg30: [10, null, 250, 3.5, 99][i] as number | null }));
  assert.deepEqual(sortCards(priced, "value", "desc").map((r) => r.avg30), [250, 99, 10, 3.5, null]);
  assert.deepEqual(sortCards(priced, "value", "asc").map((r) => r.avg30), [3.5, 10, 99, 250, null]); // sem preço no fim

  assert.equal(defaultDir("hp"), "desc");
  assert.equal(defaultDir("value"), "desc");
  assert.equal(defaultDir("number"), "asc");
  assert.equal(hpValue({ hp: null }), null);
  assert.equal(hpValue({ hp: "abc" }), null);
  assert.equal(rows.length, sortCards(rows, "hp", "asc").length); // não perde cartas
});
