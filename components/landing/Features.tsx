import {
  Sparkles,
  BarChart3,
  Calendar,
  MessageSquare,
  Zap,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    title: "AI Content Generation",
    description:
      "Generate viral-ready posts tailored to your brand voice with our advanced Gemini-powered AI engine. Draft, rewrite, and optimize in seconds.",
    icon: Sparkles,
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
    glow: "from-violet-500/20",
  },
  {
    title: "Omnichannel Scheduling",
    description:
      "Schedule across X, LinkedIn, and Instagram from a single, intuitive calendar — with drag-and-drop rescheduling and per-platform previews.",
    icon: Calendar,
    color: "text-blue-300",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    glow: "from-blue-500/20",
  },
  {
    title: "Real-time Analytics",
    description:
      "Deep dive into your performance with detailed metrics on reach, engagement, and conversion — updated the moment a post lands.",
    icon: BarChart3,
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/20",
    glow: "from-cyan-500/20",
  },
  {
    title: "Smart Auto-Replies",
    description:
      "Engage 24/7. Keyword-triggered AI replies that respect your brand voice and never act on a crafted injection attempt.",
    icon: MessageSquare,
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    glow: "from-emerald-500/20",
  },
  {
    title: "Lightning-Fast Workflow",
    description:
      "Save hours every week with bulk uploads, reusable templates, and automated media optimization via ImageKit transforms.",
    icon: Zap,
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    glow: "from-amber-500/20",
  },
  {
    title: "Enterprise Security",
    description:
      "AES-256-GCM at rest, key versioning, OAuth state HMAC, and signed webhook endpoints. Your data is safe by construction.",
    icon: ShieldCheck,
    color: "text-rose-300",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/20",
    glow: "from-rose-500/20",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-violet-600/10 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 px-6">
          <h2 className="text-violet-400 font-bold tracking-wider uppercase text-sm mb-3">
            Core Capabilities
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Built for scale,
            <br className="md:hidden" /> designed for speed
          </h3>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg">
            Everything you need to dominate social media without burning out —
            from draft to publish to reply, fully automated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 overflow-hidden backdrop-blur"
            >
              {/* Hover glow */}
              <div
                className={`absolute -inset-px rounded-[2rem] bg-gradient-to-br ${feature.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}
              />
              {/* Subtle top-right accent */}
              <div
                className={`absolute -top-8 -right-8 w-32 h-32 ${feature.bg} blur-3xl rounded-full opacity-40 group-hover:opacity-70 transition-opacity`}
              />

              <div
                className={`relative w-14 h-14 rounded-2xl ${feature.bg} ring-1 ${feature.ring} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
              >
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h4 className="relative text-xl font-bold text-white mb-3">
                {feature.title}
              </h4>
              <p className="relative text-gray-400 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
