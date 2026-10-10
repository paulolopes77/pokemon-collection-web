"use client";

import { useEffect, useRef } from "react";

/** Graus de rotação por pixel de scroll (≈ uma volta a cada 3000 px). */
export const DEGREES_PER_PX = 0.12;

/** Pokébola grande do fundo: roda conforme se faz scroll (parada se o sistema pedir menos movimento). */
export function ScrollSpinBall() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      el.style.setProperty("--spin", reduced.matches ? "0" : String(window.scrollY * DEGREES_PER_PX));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    reduced.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      reduced.removeEventListener("change", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="bg-ball" aria-hidden />;
}
