import type { Metadata } from "next";
import { Geist, Noto_Sans_JP } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-siteops",
});

const notoSansJp = Noto_Sans_JP({
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp-siteops",
});

export const metadata: Metadata = {
  title: {
    default: "SiteOps",
    template: "%s | SiteOps",
  },
  description: "Webサイト保守業務を組織単位で管理するSaaS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${geist.variable} ${notoSansJp.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
