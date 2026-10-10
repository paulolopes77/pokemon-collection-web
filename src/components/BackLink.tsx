"use client";

import { useRouter } from "next/navigation";

/** Volta à página anterior (Coleção, Wishlist, Set, Pesquisa…); sem histórico, vai para `fallback`. */
export default function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="text-sm text-zinc-500 underline"
    >
      ← {label}
    </a>
  );
}
