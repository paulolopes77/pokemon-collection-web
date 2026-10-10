import { notFound } from "next/navigation";
import { createUser, deleteUser } from "@/app/admin-actions";
import { getAdminUser } from "@/lib/admin";
import { MIN_PASSWORD } from "@/lib/admin-rules";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const admin = await getAdminUser();
  if (!admin) notFound();
  const { ok, error } = await searchParams;

  const { data, error: listError } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Utilizadores</h1>

      {ok && <p role="status" className="text-sm text-green-700 dark:text-green-400">{ok}</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {listError && <p role="alert" className="text-sm text-red-600">{listError.message}</p>}

      <section className="card-box space-y-3">
        <h2 className="font-semibold">Criar utilizador</h2>
        <form action={createUser} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">
            Email
            <input name="email" type="email" required autoComplete="off" className="input mt-1" />
          </label>
          <label className="text-sm">
            Password (mín. {MIN_PASSWORD})
            <input name="password" type="text" required minLength={MIN_PASSWORD} autoComplete="off" className="input mt-1" />
          </label>
          <button className="btn btn-primary">Criar</button>
        </form>
        <p className="text-xs text-zinc-500">
          O utilizador fica já confirmado e pode entrar com estes dados. Envia-lhe a password por um canal seguro.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{users.length} utilizadores</h2>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{u.email}</span>
                <span className="block text-xs text-zinc-500">
                  criado {new Date(u.created_at).toLocaleDateString("pt-PT")}
                  {u.last_sign_in_at ? ` · último acesso ${new Date(u.last_sign_in_at).toLocaleDateString("pt-PT")}` : " · nunca entrou"}
                </span>
              </span>
              {u.id !== admin.id && (
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="btn text-red-600 dark:text-red-400">Apagar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
