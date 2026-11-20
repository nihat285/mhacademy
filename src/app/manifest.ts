import type { MetadataRoute } from "next";

/** Web app manifest: lets Android/Chrome install the site and shows the brand icon on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MH Academy",
    short_name: "MH Academy",
    description: "Onlayn sınaqlar, video dərslər, səhv təhlili və peşəkar müəllimlər.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "az",
    background_color: "#0c1730",
    theme_color: "#0c1730",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
