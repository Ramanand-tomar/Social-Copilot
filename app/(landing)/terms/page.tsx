import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service · Social Copilot",
  description: "Terms of Service and Usage Policy for Social Copilot.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6 sm:p-12 max-w-4xl mx-auto space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Terms of Service</h1>
        <p className="text-sm text-zinc-400">Last updated: April 12, 2026</p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By creating an account or accessing Social Copilot, you agree to be bound by these Terms of Service and all applicable developer policies of connected third-party platforms (e.g. Meta, X, LinkedIn, Google/YouTube, TikTok, Pinterest).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Acceptable Use Policy</h2>
          <p>
            You agree not to use Social Copilot to publish illegal, fraudulent, harmful, or abusive content, nor to violate platform spam guidelines via automated reply rules.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Subscriptions & Billing</h2>
          <p>
            Paid plans (Pro and Business) are billed on a recurring monthly or annual basis via Clerk Billing. Plan quotas and feature limits are enforced server-side.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Limitation of Liability</h2>
          <p>
            Social Copilot provides automated publishing tools &quot;as is&quot;. We are not liable for third-party platform API outages, account suspensions resulting from user content policy violations, or service interruptions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">5. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms or engage in malicious automation.
          </p>
        </section>
      </div>
    </div>
  );
}
