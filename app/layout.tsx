import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import TelegramApp from "@/components/TelegramApp";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мой гардероб",
  description: "Управляйте своим гардеробом и создавайте образы",
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
    <html lang="ru">
      <body>
        <TelegramApp>
          {children}
          <BottomNav />
        </TelegramApp>
      </body>
    </html>
  );
}
