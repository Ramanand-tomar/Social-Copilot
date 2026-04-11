"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Zap, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: { monthly: "$0", annual: "$0" },
    description: "Perfect for individuals and side projects.",
    features: [
      "2 social accounts",
      "10 posts per month",
      "Basic AI generation",
      "Standard support",
    ],
    cta: "Start for Free",
    href: "/sign-up",
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: "$29", annual: "$24" },
    description: "Designed for content creators and small teams.",
    features: [
      "10 social accounts",
      "Unlimited posts",
      "Priority AI engine",
      "Advanced analytics",
      "Bulk scheduling",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: "$99", annual: "$79" },
    description: "For agencies and high-growth brands.",
    features: [
      "Unlimited accounts",
      "Custom AI models",
      "Dedicated account manager",
      "API access",
      "White-label reports",
      "24/7 VIP support",
    ],
    cta: "Contact Sales",
    href: "#",
    popular: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 px-6">
          <h2 className="text-indigo-400 font-bold tracking-wider uppercase text-sm mb-3">
            Transparent Pricing
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-8">
            Scale your influence,
            <br className="md:hidden" /> not your costs
          </h3>

          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${
                !isAnnual ? "text-white" : "text-gray-500"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 bg-white/10 rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Toggle billing period"
            >
              <div
                className={`w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full transition-transform duration-300 ${
                  isAnnual ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                isAnnual ? "text-white" : "text-gray-500"
              }`}
            >
              Yearly{" "}
              <span className="text-emerald-400 text-xs ml-1 font-bold">
                (Save 20%)
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`relative p-10 rounded-[2.5rem] border backdrop-blur transition-all duration-300 flex flex-col ${
                tier.popular
                  ? "bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-indigo-500/50 shadow-2xl shadow-indigo-600/20 scale-[1.02]"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
              }`}
            >
              {tier.popular && (
                <>
                  <div className="absolute -inset-px rounded-[2.5rem] bg-gradient-to-b from-indigo-500/50 to-transparent -z-10" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-indigo-600/50">
                    <Zap className="w-3 h-3 fill-current" />
                    Most Popular
                  </div>
                </>
              )}

              <div className="mb-8">
                <h4 className="text-xl font-bold text-white mb-2">
                  {tier.name}
                </h4>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">
                  {isAnnual ? tier.price.annual : tier.price.monthly}
                </span>
                <span className="text-gray-400 font-medium">/month</span>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href={tier.href}
                className={`inline-flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-bold text-base transition-all duration-300 ${
                  tier.popular
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.6)] hover:scale-[1.02]"
                    : "bg-white/5 border border-white/15 text-white hover:bg-white/10 hover:border-white/25"
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-10">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
