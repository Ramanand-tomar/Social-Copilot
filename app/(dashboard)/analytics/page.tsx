"use client";

import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  ArrowUpRight, 
  Sparkles,
  Lock,
  Zap,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="flex-1 h-full relative overflow-hidden">
      {/* Radiant Background Effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Text Content */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4 animate-pulse">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Next Evolution</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-tight">
              Deep <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Intelligence
              </span>
              <br /> is Coming.
            </h1>
            
            <p className="text-zinc-400 text-lg lg:text-xl leading-relaxed max-w-lg mx-auto lg:mx-0">
              We're building an advanced AI analytics engine that goes beyond raw metrics. Predict trends, analyze sentiment, and optimize your reach automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 w-full sm:w-auto">
                Join Beta Waitlist
              </Button>
              <Button variant="outline" size="lg" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 h-14 px-8 rounded-2xl w-full sm:w-auto">
                View Roadmap
              </Button>
            </div>
          </div>

          {/* Visual Placeholder Grid */}
          <div className="flex-1 w-full grid grid-cols-2 gap-4 relative">
             {/* Overlay Lock */}
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-[3rem] border border-white/5">
                <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-4 shadow-2xl border border-white/5">
                  <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <span className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px]">Restricted Access</span>
             </div>

             <Card className="bg-zinc-900/50 border-white/5 h-48 rounded-[2rem] flex flex-col p-6 items-start justify-between">
                <TrendingUp className="w-8 h-8 text-indigo-500/50" />
                <div className="space-y-2 w-full">
                  <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                  <div className="h-2 w-1/2 bg-white/5 rounded-full" />
                </div>
             </Card>
             <Card className="bg-zinc-900/50 border-white/5 h-48 rounded-[2rem] translate-y-8 flex flex-col p-6 items-start justify-between">
                <BarChart3 className="w-8 h-8 text-emerald-500/50" />
                <div className="space-y-2 w-full">
                  <div className="h-2 w-full bg-white/5 rounded-full" />
                  <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                </div>
             </Card>
             <Card className="bg-zinc-900/50 border-white/5 h-48 rounded-[2rem] flex flex-col p-6 items-start justify-between">
                <Target className="w-8 h-8 text-rose-500/50" />
                <div className="space-y-2 w-full">
                  <div className="h-2 w-1/2 bg-white/5 rounded-full" />
                  <div className="h-2 w-full bg-white/5 rounded-full" />
                </div>
             </Card>
             <Card className="bg-zinc-900/50 border-white/5 h-48 rounded-[2rem] translate-y-8 flex flex-col p-6 items-start justify-between">
                <Zap className="w-8 h-8 text-amber-500/50" />
                <div className="space-y-2 w-full">
                  <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                  <div className="h-2 w-1/4 bg-white/5 rounded-full" />
                </div>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
