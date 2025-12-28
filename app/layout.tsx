import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import SessionProvider from "@/components/providers/SessionProvider"; // Temporarily disabled

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Electrical Estimates - Professional Quote Generator",
  description: "Create professional electrical estimates with AI-powered pricing research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* <SessionProvider> Temporarily disabled while we fix NextAuth */}
        <div className="min-h-screen bg-background-primary">
          {children}
        </div>
        {/* </SessionProvider> */}
      </body>
    </html>
  );
}
