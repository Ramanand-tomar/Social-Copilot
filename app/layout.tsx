import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";


const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "Social Copilot — Multi-Platform Social Media Automation",
    template: "%s · Social Copilot",
  },
  description: "Schedule, publish, and automate engagement across nine social networks with AI captions and image transformations.",
  openGraph: {
    title: "Social Copilot — Multi-Platform Social Media Automation",
    description: "Schedule, publish, and automate engagement across nine social networks from a single dashboard.",
    url: "https://social-copilot-ten.vercel.app",
    siteName: "Social Copilot",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Copilot",
    description: "Schedule and automate your social media across 9 networks.",
  },
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
