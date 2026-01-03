import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Recipe Flow",
  description: "Transform recipe screenshots into interactive cooking flowcharts with timers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Navigation />
        <main className="min-h-screen pb-20">
          {children}
        </main>
      </body>
    </html>
  );
}
