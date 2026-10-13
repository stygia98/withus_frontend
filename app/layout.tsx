import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { withusFonts } from "./fonts";
import { Providers } from "./providers";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "withus",
  description: "세그먼트 기반 CRM 마케팅 자동화",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={withusFonts}>
      <body className={`${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
