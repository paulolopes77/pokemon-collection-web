/** Letra (símbolo oficial do TCG) e cor de cada tipo de energia. */
export const ENERGY: Record<string, { letter: string; label: string; bg: string; fg: string }> = {
  Grass: { letter: "G", label: "Planta", bg: "#4caf50", fg: "#fff" },
  Fire: { letter: "R", label: "Fogo", bg: "#e8590c", fg: "#fff" },
  Water: { letter: "W", label: "Água", bg: "#1c7ed6", fg: "#fff" },
  Lightning: { letter: "L", label: "Elétrico", bg: "#fcc419", fg: "#000" },
  Psychic: { letter: "P", label: "Psíquico", bg: "#9c36b5", fg: "#fff" },
  Fighting: { letter: "F", label: "Lutador", bg: "#a0522d", fg: "#fff" },
  Darkness: { letter: "D", label: "Escuridão", bg: "#343a40", fg: "#fff" },
  Metal: { letter: "M", label: "Metal", bg: "#868e96", fg: "#fff" },
  Fairy: { letter: "Y", label: "Fada", bg: "#f06595", fg: "#fff" },
  Dragon: { letter: "N", label: "Dragão", bg: "#c9a227", fg: "#000" },
  Colorless: { letter: "C", label: "Incolor", bg: "#ced4da", fg: "#000" },
};

export function energyInfo(type: string) {
  return ENERGY[type] ?? { letter: type.slice(0, 1).toUpperCase() || "?", label: type, bg: "#adb5bd", fg: "#000" };
}

/** O texto da carta tem algo para mostrar? */
export function hasCardText(t: {
  abilities: unknown[];
  attacks: unknown[];
  weaknesses: unknown[];
  resistances: unknown[];
  retreat: unknown[];
  rules: unknown[];
  flavor: string | null;
  evolvesFrom: string | null;
} | null | undefined): boolean {
  return !!t && (t.abilities.length > 0 || t.attacks.length > 0 || t.rules.length > 0 || t.weaknesses.length > 0 ||
    t.resistances.length > 0 || t.retreat.length > 0 || !!t.flavor || !!t.evolvesFrom);
}
