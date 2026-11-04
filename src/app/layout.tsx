import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bishoftu Finance — Tax Collection Process Control",
  description: "End-to-end tax collection process control system for Bishoftu city: tax payer registry, Team 1 assignment, bank payment, Team 2 government receipts.",
  keywords: ["Bishoftu", "Finance", "Tax Collection", "Ethiopia", "Government Receipt", "Bank Receipt"],
  authors: [{ name: "Bishoftu Finance Office" }],
  openGraph: {
    title: "Bishoftu Finance — Tax Collection Control",
    description: "End-to-end tax collection process control system",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
