import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chill & Enjoy",
  description: "A personal glassmorphism music player"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}