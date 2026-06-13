import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Athlete Dashboard",
  description: "N-of-1 Performance Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col`} style={{ background: "var(--bg)", color: "var(--text)" }}>
        <main className="flex-1 pb-20">
          {children}
        </main>
        <NavBar />
      </body>
    </html>
  );
}
