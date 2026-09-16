import type { Metadata } from "next";
import { Kaisei_Decol, Zen_Kaku_Gothic_New } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const displayFont = Kaisei_Decol({
  display: "swap",
  preload: false,
  variable: "--font-kaisei",
  weight: ["400", "700"],
});

const bodyFont = Zen_Kaku_Gothic_New({
  display: "swap",
  preload: false,
  variable: "--font-zen",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "四季彩MAP",
  description: "日本の季節を、みんなの気配から眺める地図。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
