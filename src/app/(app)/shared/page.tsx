import Link from "next/link";
import { loadSharedWithMe } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { int } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SharedPage() {
  const supabase = await createClient();
  const { available, owners } = await loadSharedWithMe(supabase);
  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">Partilhado comigo</h1>
      {!available ? (
        <p className="text-zinc-500">A partilha ainda não está ativa (falta correr a migração 0004 no Supabase).</p>
      ) : owners.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">Ainda ninguém partilhou a coleção contigo.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {owners.map((o) => (
            <li key={o.owner_id}>
              <Link href={`/shared/${o.owner_id}`} className="card-box block hover:border-zinc-400">
                <p className="font-semibold">{o.display_name}</p>
                <p className="text-sm text-zinc-500">
                  {int(o.total_cards)} cartas · {int(o.unique_cards)} diferentes
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
