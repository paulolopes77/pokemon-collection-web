import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coleção Pokémon",
  description: "Gestor de coleção de cartas Pokémon com preços do Cardmarket (EUR).",
};
export const viewport: Viewport = { themeColor: "#d32f2f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
