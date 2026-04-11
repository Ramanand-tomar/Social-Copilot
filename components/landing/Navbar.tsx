"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0a0a1a]/80 backdrop-blur-lg border-b border-white/10 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 transform group-hover:rotate-[12deg] transition-transform duration-500">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            SocialCopilot
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            FAQ
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex items-center h-10 px-4 rounded-xl text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center h-10 px-4 rounded-xl text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Dashboard
              </Link>
              <UserButton />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
