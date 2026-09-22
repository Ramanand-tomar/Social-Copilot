"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeModalContextType {
  openUpgradeModal: (message?: string, limitName?: string) => void;
  closeUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType>({
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
});

export const useUpgradeModal = () => useContext(UpgradeModalContext);

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [limitName, setLimitName] = useState<string | null>(null);

  const openUpgradeModal = (msg?: string, limit?: string) => {
    setMessage(msg || "You have reached the limits of your current plan.");
    setLimitName(limit || "Plan Limit Reached");
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
  };

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f0f23] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <button
              onClick={closeUpgradeModal}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {limitName || "Upgrade Your Plan"}
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {message || "Unlock higher limits, advanced AI generation, and more connected accounts."}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Link href="/billing" onClick={closeUpgradeModal}>
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl h-12 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25">
                  <span>View Upgrade Options</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={closeUpgradeModal}
                className="w-full text-zinc-400 hover:text-white rounded-2xl h-10 text-xs font-semibold"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </UpgradeModalContext.Provider>
  );
}
