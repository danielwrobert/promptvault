import type { Metadata } from "next";
import { Ovo, Mulish } from "next/font/google";
import { themeInitScript } from "@/app/lib/theme";
import "./globals.css";

const ovo = Ovo({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ovo",
});

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
});

export const metadata: Metadata = {
  title: "PromptVault",
  description: "Your personal library of AI prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ovo.variable} ${mulish.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-page font-body text-ink transition-colors duration-250">
        {children}
      </body>
    </html>
  );
}
