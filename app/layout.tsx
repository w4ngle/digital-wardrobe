import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import TelegramApp from "@/components/TelegramApp";
import "./globals.css";

const sans = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-sans" });
const display = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Гардероб Эмилии",
  description: "Личный гардероб Эмилии",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable}`}>
      <body>
        <TelegramApp>
          {children}
          <BottomNav />
        </TelegramApp>
      </body>
    </html>
  );
}
