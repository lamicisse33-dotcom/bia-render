import type { Metadata, Viewport } from "next";
import "./globals.css";

/* BIA s'installe sur l'écran d'accueil comme une application, et c'est SON
   visage qui doit apparaître sur l'icône — pas la marque d'un navigateur ni
   un carré gris.

   Trois choses sont nécessaires, et elles ne servent pas les mêmes appareils :

   — le manifeste, que lisent Android et les navigateurs de bureau. C'est lui
     qui donne le nom, l'icône, la couleur de fond et le plein écran ;
   — `apple-touch-icon`, que lit iOS, qui ignore le manifeste pour l'icône :
     sans cette balise, l'iPhone met une photo de la page à la place du
     visage de BIA ;
   — `apple-mobile-web-app-*`, pour qu'iOS ouvre BIA sans la barre d'adresse
     de Safari, et qu'on la prenne pour une vraie application.

   Les icônes sont découpées dans la planche des 24 expressions : le même
   visage que celui qui parle à l'écran, et le même que sur bia.khalam.app. */
export const metadata: Metadata = {
  title: "BIA — Assistante wolof de KHALAM",
  description: "BIA, intelligence artificielle indépendante en wolof urbain de Dakar.",
  applicationName: "BIA",
  manifest: "/manifeste.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icone-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/icone-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "BIA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

/* La couleur de la barre système : la même que le fond de la page, pour que
   rien ne tranche quand BIA s'ouvre en plein écran. `viewport-fit: cover`
   laisse le visage descendre sous l'encoche des iPhone. */
export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="wo">
      <body className="antialiased">{children}</body>
    </html>
  );
}
