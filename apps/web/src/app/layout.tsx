import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game of Braza",
  description: "Цифровая анкета персонажа",
  applicationName: "Game of Braza",
  // <link rel="manifest"> Next добавляет сам из app/manifest.ts; иконка/apple-touch —
  // из app/icon.png и app/apple-icon.png. Здесь — только iOS-мета для standalone-режима.
  appleWebApp: {
    capable: true,
    title: "Game of Braza",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
