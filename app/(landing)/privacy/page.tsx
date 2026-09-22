import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy · Social Copilot",
  description: "Privacy Policy and Data Protection Terms for Social Copilot.",
};

export default function PrivacyPage() {
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
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-zinc-400">Last updated: April 12, 2026</p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
          <p>
            When you register for Social Copilot, we collect account details provided through Clerk (such as your name, email address, and profile picture). When you connect social media platforms via OAuth 2.0, we store encrypted access and refresh tokens necessary to perform publishing and comment automated replies on your behalf.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. How We Use Your Data</h2>
          <p>
            Your information is used strictly to provide the core services of Social Copilot: scheduling posts, publishing content to selected social networks, generating AI captions via Google Gemini, processing media uploads via ImageKit, and executing auto-reply workflows.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Data Security & Encryption</h2>
          <p>
            All social account credentials and tokens are encrypted at rest using AES-256-GCM. We enforce strict authentication via Clerk and do not store or log plain-text authentication tokens.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Account Deletion & Rights</h2>
          <p>
            You have the right to delete your Social Copilot account at any time. Account deletion triggers a cascade that permanently removes all connected social account tokens, posts, media assets, auto-reply rules, and logs from our databases.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">5. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy or your data privacy rights, please contact privacy@socialcopilot.app.
          </p>
        </section>
      </div>
    </div>
  );
}
