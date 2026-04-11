import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTABanner() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-12 md:p-20 text-center">
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid-sm opacity-30" />

          {/* Decorative orbs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-400/30 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                Limited-time offer
              </span>
            </div>

            <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Ready to automate your <br className="hidden md:block" />
              social media success?
            </h3>
            <p className="max-w-xl mx-auto text-indigo-100 text-lg mb-12">
              Join 10,000+ creators who are already using SocialCopilot to save
              time and grow their audience.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-2xl bg-white text-indigo-700 hover:bg-gray-100 text-lg font-bold shadow-2xl transition-all hover:scale-105"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/15 text-lg font-semibold backdrop-blur transition-all"
              >
                Sign In to Dashboard
              </Link>
            </div>

            <p className="text-indigo-200 text-xs mt-8">
              ✓ 14-day free trial · ✓ No credit card required · ✓ Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
