import { test } from "node:test";
import assert from "node:assert/strict";
import { speciesFromName, speciesOf } from "../src/lib/species";
import { buildRows, filterAndSort } from "../src/lib/grouping";
import { buildNameQuery, numberSortKey, toCardRow } from "../src/lib/mappers";
import { clampInt, formatCode, generateCode, inviteState, normalizeCode } from "../src/lib/invite";
import { isAdminEmail, parseAdminEmails, validateNewUser } from "../src/lib/admin-rules";
import { setNeedsSync } from "../src/lib/sync-rules";
import { cardPrice, type CardRow, type OwnedCard } from "../src/lib/types";

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
