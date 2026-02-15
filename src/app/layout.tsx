import type { Metadata } from "next";
import { Uncial_Antiqua, Cinzel, Crimson_Text } from "next/font/google";
import "./globals.css";

const uncialAntiqua = Uncial_Antiqua({
  variable: "--font-title",
  subsets: ["latin"],
  weight: "400",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "The Vault of Azeroth",
  description: "Tracking the CLO Hoard across the Sei Realm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${uncialAntiqua.variable} ${cinzel.variable} ${crimsonText.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
