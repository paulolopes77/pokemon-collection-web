import { CollectionView } from "@/components/CollectionView";
import { loadCollection } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const supabase = await createClient();
  const items = await loadCollection(supabase, "owned");
  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">A minha coleção</h1>
      <CollectionView items={items} wishlist={false} />
    </>
  );
}
