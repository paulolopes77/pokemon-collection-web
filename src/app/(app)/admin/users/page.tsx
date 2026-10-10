import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createInvite, createUser, deleteInvite, deleteUser } from "@/app/admin-actions";
import { getAdminUser } from "@/lib/admin";
import { MIN_PASSWORD } from "@/lib/admin-rules";
import { formatCode, inviteState } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const admin = await getAdminUser();
  if (!admin) notFound();
  const { ok, error } = await searchParams;

  const { data, error: listError } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
  const users = data?.users ?? [];

  const { data: inviteData } = await createAdminClient()
    .from("invite_codes")
    .select("code, note, max_uses, uses, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const invites = (inviteData ?? []) as { code: string; note: string; max_uses: number; uses: number; expires_at: string | null }[];

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Utilizadores</h1>

      {ok && <p role="status" className="text-sm text-green-700 dark:text-green-400">{ok}</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {listError && <p role="alert" className="text-sm text-red-600">{listError.message}</p>}

      <section className="card-box space-y-3">
        <h2 className="font-semibold">Convites</h2>
        <p className="text-xs text-zinc-500">
          Quem tiver um código válido pode criar a sua própria conta em <span className="font-mono">/register</span>.
          Cada código tem um número máximo de utilizações e uma validade.
        </p>
        <form action={createInvite} className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end">
          <label className="text-sm">
            Nota (para quem é)
            <input name="note" maxLength={80} placeholder="ex.: João" className="input mt-1" />
          </label>
          <label className="text-sm">
            Usos
            <input name="max_uses" type="number" min={1} max={50} defaultValue={1} className="input mt-1" />
          </label>
          <label className="text-sm">
            Dias
            <input name="days" type="number" min={0} max={365} defaultValue={7} className="input mt-1" />
          </label>
          <button className="btn btn-primary">Gerar convite</button>
        </form>
        <p className="text-xs text-zinc-500">«Dias» = 0 significa que não expira.</p>
        {invites.length > 0 && (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {invites.map((i) => {
              const state = inviteState(i);
              const link = `${proto}://${host}/register?code=${i.code}`;
              return (
                <li key={i.code} className="space-y-1 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-base tracking-wider">{formatCode(i.code)}</span>
                    <span className={state === "ativo" ? "text-green-700 dark:text-green-400" : "text-zinc-500"}>
                      {state} · {i.uses}/{i.max_uses}
                    </span>
                    <form action={deleteInvite}>
                      <input type="hidden" name="code" value={i.code} />
                      <button className="btn text-red-600 dark:text-red-400">Apagar</button>
                    </form>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {i.note || "sem nota"}
                    {i.expires_at ? ` · expira ${new Date(i.expires_at).toLocaleDateString("pt-PT")}` : " · não expira"}
                  </p>
                  {state === "ativo" && (
                    <input readOnly value={link} aria-label="Link de registo" className="input font-mono text-xs" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
