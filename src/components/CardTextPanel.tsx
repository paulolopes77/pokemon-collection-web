import { energyInfo } from "@/lib/energy";
import type { CardText } from "@/lib/types";

function Energy({ type }: { type: string }) {
  const e = energyInfo(type);
  return (
    <span
      title={e.label}
      aria-label={e.label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm"
      style={{ background: e.bg, color: e.fg }}
    >
      {e.letter}
    </span>
  );
}

function Energies({ types }: { types: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {types.map((t, i) => (
        <Energy key={`${t}${i}`} type={t} />
      ))}
    </span>
  );
}

/** Texto da carta (em inglês): habilidades, ataques, fraqueza, resistência, recuo e regras. */
export function CardTextPanel({ text }: { text: CardText }) {
  const hasStats = text.weaknesses.length > 0 || text.resistances.length > 0 || text.retreat.length > 0;
  return (
    <section className="card-box space-y-3" aria-label="Texto da carta">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Texto da carta</h2>
        <span className="text-xs text-zinc-500">em inglês</span>
      </div>

      {text.evolvesFrom && <p className="text-xs text-zinc-500">Evolui de {text.evolvesFrom}</p>}

      {text.abilities.map((a, i) => (
        <div key={`ab${i}`} className="space-y-0.5">
          <p className="text-sm">
            <span className="mr-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{a.type || "Ability"}</span>
            <span className="font-semibold text-red-700 dark:text-red-400">{a.name}</span>
          </p>
          <p className="text-sm">{a.text}</p>
        </div>
      ))}

      {text.attacks.map((a, i) => (
        <div key={`at${i}`} className="space-y-0.5">
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Energies types={a.cost} />
              <span className="font-semibold">{a.name}</span>
            </span>
            {a.damage && <span className="font-semibold tabular-nums">{a.damage}</span>}
          </p>
          {a.text && <p className="text-sm">{a.text}</p>}
        </div>
      ))}

      {text.rules.map((r, i) => (
        <p key={`ru${i}`} className="whitespace-pre-line text-sm italic text-zinc-700 dark:text-zinc-300">
          {r}
        </p>
      ))}

      {hasStats && (
        <dl className="grid grid-cols-3 gap-2 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-700">
          <div>
            <dt className="text-zinc-500">Fraqueza</dt>
            <dd className="flex flex-wrap items-center gap-1">
              {text.weaknesses.length ? text.weaknesses.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1"><Energy type={w.type} />{w.value}</span>
              )) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Resistência</dt>
            <dd className="flex flex-wrap items-center gap-1">
              {text.resistances.length ? text.resistances.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1"><Energy type={w.type} />{w.value}</span>
              )) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Recuo</dt>
            <dd>{text.retreat.length ? <Energies types={text.retreat} /> : "—"}</dd>
          </div>
        </dl>
      )}

      {text.flavor && <p className="text-xs italic text-zinc-500">{text.flavor}</p>}
      {text.regulationMark && <p className="text-xs text-zinc-500">Marca de regulamento: {text.regulationMark}</p>}
    </section>
  );
}
