import Link from "next/link";
import { signIn } from "../actions";

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
      <p className="text-sm">
        <Link href="/forgot" className="underline">Esqueci-me da password</Link>
      </p>
      <p className="text-sm">
        Tens um código de convite? <Link href="/register" className="underline">Criar conta</Link>
      </p>
    </main>
  );
}
