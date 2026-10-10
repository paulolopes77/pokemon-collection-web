import { changePassword } from "@/app/actions";
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
