import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/movil/propietarios/",
    name: "VAM Condominios",
    short_name: "VAM",
    description:
      "Portal de propietarios de VAM Condominios para consultar estado de cuenta, pagos, recibos, anuncios y servicios del condominio.",
    start_url: "/movil/propietarios/login",
    scope: "/movil/propietarios/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait",
    categories: ["business", "finance", "utilities"],
    lang: "es-DO",
    icons: [
      {
        src: "/icons/vam-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vam-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
