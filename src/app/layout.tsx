import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "MH Academy — Premium onlayn təhsil platforması", template: "%s · MH Academy" },
  description: "Onlayn sınaqlar, video dərslər, səhv təhlili və peşəkar müəllimlər. Ölçülə bilən akademik irəliləyiş.",
  applicationName: "MH Academy",
  manifest: "/manifest.webmanifest",
  openGraph: { siteName: "MH Academy", locale: "az_AZ", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

// The theme lives in a cookie so the server renders the right one on first paint
// (no inline <script>, no flash).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("mh-theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="az" data-theme={theme} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#main" className="skip-link">
          Məzmuna keç
        </a>
        {children}
      </body>
    </html>
  );
}
