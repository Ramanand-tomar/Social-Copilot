import { Star, Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "SocialCopilot has fundamentally changed how we manage our brand. The AI suggestions are uncannily accurate and have boosted our engagement by over 400% in just two months.",
    author: "Sarah Jenkins",
    role: "Head of Growth",
    company: "TechScale",
    avatar: "https://i.pravatar.cc/150?u=sarah",
  },
  {
    quote:
      "As a solo creator, I was drowning in content scheduling. This tool gave me my life back. The dashboard is a joy to use and the auto-reply feature is a game-changer.",
    author: "David Chen",
    role: "Independent Creator",
    company: "DavidCreates",
    avatar: "https://i.pravatar.cc/150?u=david",
  },
  {
    quote:
      "Finally, a social media tool that doesn't feel like it's from 2010. Pure speed, incredible AI, and a design that actually makes you want to work.",
    author: "Elena Rodriguez",
    role: "CMO",
    company: "VentureFlow",
    avatar: "https://i.pravatar.cc/150?u=elena",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 px-6">
          <h2 className="text-emerald-400 font-bold tracking-wider uppercase text-sm mb-3">
            Community Love
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Trusted by 10,000+ creators
          </h3>
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <span className="text-gray-300 text-sm font-bold ml-2">
              4.9/5
            </span>
            <span className="text-gray-500 text-sm">· 1,200+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] flex flex-col transition-all duration-500 backdrop-blur"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-white/[0.04] group-hover:text-white/[0.08] transition-colors" />

              <div className="flex gap-1 mb-6 text-amber-400 relative">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-current" />
                ))}
              </div>

              <p className="text-gray-200 mb-8 flex-1 leading-relaxed relative">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-4 pt-6 border-t border-white/5 w-full">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500/30">
                  <Image
                    src={t.avatar}
                    fill
                    sizes="48px"
                    alt={t.author}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{t.author}</h4>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.role} ·{" "}
                    <span className="text-gray-400 font-medium">
                      {t.company}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
