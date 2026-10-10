import Link from "next/link";
import { signOut } from "../actions";
import { getAdminUser } from "@/lib/admin";

const NAV = [
  { href: "/", label: "Coleção" },
  { href: "/sets", label: "Sets" },
  { href: "/search", label: "Pesquisar" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account", label: "Conta" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = !!(await getAdminUser());
  const nav = isAdmin ? [...NAV, { href: "/admin/users", label: "Utilizadores" }] : NAV;
  return (
    <div className="mx-auto max-w-6xl px-3 pb-16">
      <header className="sticky top-0 z-10 -mx-3 flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="btn whitespace-nowrap border-transparent">
            {n.label}
          </Link>
        ))}
        <form action={signOut} className="ml-auto">
          <button className="btn whitespace-nowrap">Sair</button>
        </form>
      </header>
      <div className="pt-4">{children}</div>
    </div>
  );
}
