import { CollectionView } from "@/components/CollectionView";
import { ShareBox } from "@/components/ShareBox";
import { loadCollection, loadShareState } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const supabase = await createClient();
  const [{ data: auth }, items] = await Promise.all([supabase.auth.getUser(), loadCollection(supabase, "owned")]);
  const share = auth.user ? await loadShareState(supabase, auth.user.id) : null;
  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">A minha coleção</h1>
      {share?.available && <ShareBox users={share.users} sharedWith={share.sharedWith} />}
      <CollectionView items={items} wishlist={false} />
    </>
  );
}
