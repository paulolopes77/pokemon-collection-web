import Link from "next/link";
import { signOut } from "../actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAdminUser } from "@/lib/admin";

const NAV = [
  { href: "/", label: "Coleção" },
  { href: "/sets", label: "Sets" },
  { href: "/search", label: "Pesquisar" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/shared", label: "Partilhado comigo" },
];
const RIGHT = [{ href: "/account", label: "Conta" }];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = !!(await getAdminUser());
  const right = isAdmin ? [...RIGHT, { href: "/admin/users", label: "Utilizadores" }] : RIGHT;
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-16 sm:px-6">
      <header className="sticky top-0 z-10 -mx-3 flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white/90 px-3 py-2 sm:-mx-6 sm:px-6 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="btn whitespace-nowrap border-transparent">
            {n.label}
          </Link>
        ))}
        <ThemeToggle className="ml-auto" />
        {right.map((n) => (
          <Link key={n.href} href={n.href} className="btn whitespace-nowrap border-transparent">
            {n.label}
          </Link>
        ))}
        <form action={signOut}>
          <button className="btn whitespace-nowrap">Sair</button>
        </form>
      </header>
      <div className="pt-4">{children}</div>
    </div>
  );
}
