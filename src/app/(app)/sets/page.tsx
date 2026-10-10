import Link from "next/link";
import { SetsList } from "@/components/SetsList";
import { SyncButton } from "@/components/SyncButton";
import { loadOwnedBySet, loadSets } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { syncSetsAction } from "../../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SetsPage() {
  const supabase = await createClient();
  const [sets, owned] = await Promise.all([loadSets(supabase), loadOwnedBySet(supabase)]);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Sets</h1>
        <SyncButton action={syncSetsAction} label="Atualizar lista de sets" auto={sets.length === 0} className="min-w-0 flex-1" />
      </div>
      {sets.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">A carregar sets da Pokémon TCG API…</p>
      ) : (
        <SetsList sets={sets} owned={owned} />
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Dados: Pokémon TCG API · <Link href="/search" className="underline">pesquisar cartas</Link>
      </p>
    </>
  );
}
