"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  limitName?: string;
}

export const UpgradeModal = ({ 
  open, 
  onOpenChange, 
  title = "Upgrade to Unlock More", 
  description = "You've reached the limit of your current plan. Upgrade to a professional plan to continue scaling your social presence.",
  limitName
}: UpgradeModalProps) => {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-900 text-zinc-100 overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="p-8 space-y-6">
          <DialogHeader>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Rocket className="w-6 h-6 text-indigo-400" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm leading-relaxed pt-2">
              {limitName ? (
                <>You've reached your maximum allowance for <span className="text-white font-semibold">{limitName}</span> on the Free plan.</>
              ) : description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Why upgrade to Pro?</p>
            <ul className="space-y-3">
              {[
                "Unlimited Scheduled Posts",
                "Advanced AI Insights & Captions",
                "Connect up to 10 Social Accounts",
                "Priority Support & Analytics",
                "10GB Media Cloud Storage"
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Safe & Secure Payment</p>
              <p className="text-[10px] text-zinc-500">Managed securely via Clerk Billing</p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-zinc-900/50 p-6 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-zinc-500 hover:text-white order-2 sm:order-1"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={() => router.push("/billing")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 shadow-[0_0_20px_rgba(79,70,229,0.3)] order-1 sm:order-2"
          >
            Upgrade Now
            <Zap className="w-4 h-4 ml-2 fill-current" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
