"use client";

import { useEffect, useRef, useState } from "react";

export type Slide = { key: string; url: string; label: string };

/**
 * Carrossel das imagens da carta: a original (inglês) e, quando existirem, a mesma carta noutros idiomas.
 * Telemóvel: deslizar com o dedo (scroll horizontal com encaixe). PC: clicar na carta avança; também setas do teclado.
 */
export function CardGallery({
  cardId,
  name,
  image,
  initialExtra,
}: {
  cardId: string;
  name: string;
  image: string;
  /** Só para testes/pré-visualização: evita ir buscar as imagens à rede. */
  initialExtra?: Slide[];
}) {
  const [extra, setExtra] = useState<Slide[]>(initialExtra ?? []);
  const [loading, setLoading] = useState(initialExtra === undefined);
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialExtra !== undefined) return;
    let cancelled = false;
    fetch(`/api/card-images?id=${encodeURIComponent(cardId)}`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((json: { images?: { lang: string; label: string; url: string }[] }) => {
        if (!cancelled) setExtra((json.images ?? []).map((i) => ({ key: i.lang, url: i.url, label: i.label })));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cardId, initialExtra]);

  const slides: Slide[] = [{ key: "en", url: image, label: "Inglês" }, ...extra.filter((s) => !broken.has(s.key))];
  const n = slides.length;
  const current = Math.min(index, n - 1);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * ((i + n) % n), behavior: "smooth" });
  }

  function onClickImage() {
    // No PC (rato) um clique avança; no telemóvel desliza-se com o dedo.
    if (n > 1 && window.matchMedia("(pointer: fine)").matches) go(current + 1);
  }

  return (
    <div className="space-y-2">
      <div
        ref={track}
        role="group"
        aria-roledescription="carrossel"
        aria-label={`Imagens de ${name}`}
        tabIndex={0}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault(); // senão o scroll nativo do teclado cancela a animação
          go(current + (e.key === "ArrowRight" ? 1 : -1));
        }}
        className="mx-auto flex max-w-sm snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <div key={s.key} className="w-full shrink-0 snap-center px-8 pb-12 pt-3" aria-hidden={i !== current}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={`${name} (${s.label})`}
              onClick={onClickImage}
              onError={() => s.key !== "en" && setBroken((prev) => new Set(prev).add(s.key))}
              draggable={false}
              className={`w-full rounded-xl drop-shadow-[0_14px_18px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)] ${n > 1 ? "cursor-pointer" : ""}`}
            />
          </div>
        ))}
      </div>

      {n > 1 ? (
        <div className="mx-auto flex max-w-sm items-center justify-between gap-2 px-8 text-sm">
          <button type="button" className="btn px-2 py-0.5" onClick={() => go(current - 1)} aria-label="Imagem anterior">
            ‹
          </button>
          <span className="flex flex-col items-center">
            <span className="font-medium">
              {slides[current].label} · {current + 1}/{n}
            </span>
            <span className="mt-1 flex gap-1.5" aria-hidden>
              {slides.map((s, i) => (
                <span key={s.key} className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-brand" : "bg-zinc-400"}`} />
              ))}
            </span>
          </span>
          <button type="button" className="btn px-2 py-0.5" onClick={() => go(current + 1)} aria-label="Imagem seguinte">
            ›
          </button>
        </div>
      ) : (
        loading && <p className="text-center text-xs text-zinc-500">A procurar outras versões da carta…</p>
      )}
    </div>
  );
}
