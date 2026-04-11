import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";


const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Social Copilot",
  description: "Multi-Platform Post Scheduler with AI Features",
};

import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/components/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${outfit.className}`}
      >
        <body className="min-h-full flex flex-col">
          <QueryProvider>
            {children}
            <Toaster position="top-right" closeButton />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
