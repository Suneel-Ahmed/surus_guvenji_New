import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guvenli Surus",
  description: "Road safety report system for operators and drivers"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="bg-slate-50 text-slate-900">
        <Header />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
