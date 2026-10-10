import Link from "next/link";
import { signUp } from "../actions";
import { MIN_PASSWORD } from "@/lib/admin-rules";
import { formatCode, normalizeCode } from "@/lib/invite";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <p className="text-sm text-zinc-500">O registo é só por convite. Pede o código a quem gere o site.</p>
      <form action={signUp} className="flex flex-col gap-3">
        <label className="text-sm">
          Código de convite
          <input
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={code ? formatCode(normalizeCode(code)) : ""}
            className="input mt-1 font-mono tracking-wider"
          />
        </label>
        <label className="text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className="input mt-1" />
        </label>
        <label className="text-sm">
          Password (mín. {MIN_PASSWORD} caracteres)
          <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="input mt-1" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button className="btn btn-primary">Criar conta</button>
      </form>
      <p className="text-sm">
        Já tens conta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </main>
  );
}
