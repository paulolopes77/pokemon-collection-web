const POSSESSIVE = /^.+?['’]s\s+/;
const HYPHEN_SUFFIX = /-(ex|gx)$/i;
const PAREN_SUFFIX = /\s*\(.*\)$/;
const SYMBOLS = /[★☆◇δ]/g;

const LEADING = new Set([
  "mega", "m", "dark", "light", "shining", "radiant", "alolan", "galarian",
  "hisuian", "paldean", "primal", "ancient", "future",
]);
const TRAILING = new Set([
  "ex", "gx", "v", "vmax", "vstar", "v-union", "break", "prime", "legend", "lv.x", "tera",
]);

/**
 * Nome da espécie a partir do nome da carta, para agrupar por Pokémon:
 * "Mega Darkrai ex" -> "Darkrai", "Team Rocket's Mewtwo ex" -> "Mewtwo".
 */
export function speciesFromName(name: string): string {
  let n = name.replace(SYMBOLS, " ").replace(PAREN_SUFFIX, "").replace(POSSESSIVE, "").trim();
  n = n.replace(HYPHEN_SUFFIX, "");
  const tokens = n.split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && LEADING.has(tokens[0].toLowerCase())) tokens.shift();
  while (tokens.length > 1 && TRAILING.has(tokens[tokens.length - 1].toLowerCase())) tokens.pop();
  const result = tokens.join(" ") || name.trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/** Cartas que não são Pokémon ficam em "Treinadores" / "Energias". */
export function speciesOf(card: { name: string; supertype: string }): string {
  const st = card.supertype.toLowerCase();
  if (st === "trainer") return "Treinadores";
  if (st === "energy") return "Energias";
  return speciesFromName(card.name);
}
