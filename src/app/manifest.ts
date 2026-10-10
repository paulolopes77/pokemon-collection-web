import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coleção Pokémon",
    short_name: "Coleção",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#d32f2f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
