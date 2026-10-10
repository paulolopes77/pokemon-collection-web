import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requestPasswordReset } from "../actions";

export const dynamic = "force-dynamic";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <ThemeToggle className="self-end" />
      <h1 className="text-2xl font-semibold">Recuperar password</h1>
      {ok ? (
        <p role="status" className="text-sm">{ok}</p>
      ) : (
        <form action={requestPasswordReset} className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">Indica o teu email e enviamos um link para definires uma nova password.</p>
          <label className="text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className="input mt-1" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button className="btn btn-primary">Enviar link</button>
        </form>
      )}
      <p className="text-sm text-zinc-500">
        Não recebes o email? Pede ao administrador do site que reponha a tua password.
      </p>
      <p className="text-sm">
        <Link href="/login" className="underline">Voltar ao login</Link>
      </p>
    </main>
  );
}
