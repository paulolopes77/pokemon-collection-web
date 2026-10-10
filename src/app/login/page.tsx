import Link from "next/link";
import { signIn } from "../actions";
import { signupEnabled } from "@/lib/admin-rules";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Coleção Pokémon</h1>
      <form action={signIn} className="flex flex-col gap-3">
        <label className="text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className="input mt-1" />
        </label>
        <label className="text-sm">
          Password
          <input name="password" type="password" required autoComplete="current-password" className="input mt-1" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button className="btn btn-primary">Entrar</button>
      </form>
      {signupEnabled() && (
        <p className="text-sm">
          Ainda não tens conta? <Link href="/register" className="underline">Criar conta</Link>
        </p>
      )}
    </main>
  );
}
