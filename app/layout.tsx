import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";



const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Midnight24/7",
  description: "A premium creator subscription platform.",
};

export default function RootLayout({
  children,
}: { 
  children: React.ReactNode; 
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          />
        </head>
      <body className={`${inter.variable} ${geistMono.variable} bg-black text-white min-h-screen`}>
      <Navbar />
        {children}
      </body>
    </html>
  );
}
