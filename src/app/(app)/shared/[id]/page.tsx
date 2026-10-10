import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/CollectionView";
import { loadSharedCollection, loadSharedWithMe } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SharedCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { owners } = await loadSharedWithMe(supabase);
  const owner = owners.find((o) => o.owner_id === id);
  if (!owner) notFound(); // não partilhada contigo (ou partilha retirada)
  const items = await loadSharedCollection(supabase, id);
  return (
    <>
      <p className="mb-1 text-sm">
        <Link href="/shared" className="text-zinc-500 underline">
          ← Partilhado comigo
        </Link>
      </p>
      <h1 className="mb-3 text-xl font-semibold">
        Coleção de {owner.display_name} <span className="text-sm font-normal text-zinc-500">· só leitura</span>
      </h1>
      <CollectionView items={items} wishlist={false} readOnly />
    </>
  );
}
