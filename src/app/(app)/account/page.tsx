import { changePassword, updateDisplayName } from "@/app/actions";
import { MIN_PASSWORD } from "@/lib/admin-rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; reset?: string }>;
}) {
  const { error, ok, reset } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user ? await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle() : { data: null };
  const displayName = (profile as { display_name: string } | null)?.display_name ?? "";

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Conta</h1>
      <p className="text-sm text-zinc-500">{user?.email}</p>

      {reset && (
        <p role="status" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          Entraste com o link de recuperação. Define agora uma nova password.
        </p>
      )}
      {ok && <p role="status" className="text-sm text-green-700 dark:text-green-400">{ok}</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {profile && (
        <form action={updateDisplayName} className="card-box space-y-3">
          <h2 className="font-semibold">Nome visível</h2>
          <p className="text-xs text-zinc-500">É o nome que os outros utilizadores veem ao partilhar coleções (o email não é mostrado).</p>
          <input name="name" defaultValue={displayName} required minLength={2} maxLength={40} className="input" aria-label="Nome visível" />
          <button className="btn btn-primary">Guardar nome</button>
        </form>
      )}

      <form action={changePassword} className="card-box space-y-3">
        <h2 className="font-semibold">Alterar password</h2>
        <label className="block text-sm">
          Nova password (mín. {MIN_PASSWORD} caracteres)
          <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="input mt-1" />
        </label>
        <label className="block text-sm">
          Repetir password
          <input name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="input mt-1" />
        </label>
        <button className="btn btn-primary">Guardar</button>
      </form>
    </div>
  );
}
