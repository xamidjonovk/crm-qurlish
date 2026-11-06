import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { SessionProvider } from "@/features/auth/session";
export const metadata: Metadata = {
  title: "Qurilish CRM — Savdo boshqaruvi",
  description: "Arizalar, xonadonlar va jamoa boshqaruvi",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
