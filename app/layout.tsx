import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import TelegramApp from "@/components/TelegramApp";
import "./globals.css";

const sans = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Твой гардероб",
  description: "Личный цифровой гардероб",
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
    <html lang="ru" className={sans.variable}>
      <body>
        <TelegramApp>
          {children}
          <BottomNav />
        </TelegramApp>
      </body>
    </html>
  );
}
