import {
  UserPlus,
  Wand2,
  Share2,
  Check,
  Camera,
  Briefcase,
  Clock,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Connect Accounts",
    description:
      "Securely link your X, Instagram, and LinkedIn profiles in seconds using official OAuth flows. Tokens are encrypted at rest with AES-256-GCM.",
    icon: UserPlus,
    color: "from-blue-500 to-indigo-600",
    ring: "ring-blue-500/20",
  },
  {
    number: "02",
    title: "Generate Content",
    description:
      "Type a topic, get three platform-optimized drafts from Gemini. Each draft respects the strictest character limit of the channels you picked.",
    icon: Wand2,
    color: "from-violet-500 to-purple-600",
    ring: "ring-violet-500/20",
  },
  {
    number: "03",
    title: "Automate Growth",
    description:
      "Sit back while SocialCopilot schedules at peak times, retries on failure, and auto-replies to comments — all with idempotent, signed webhooks.",
    icon: Share2,
    color: "from-cyan-500 to-teal-600",
    ring: "ring-cyan-500/20",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white/[0.015] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-sm opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 px-6">
          <h2 className="text-cyan-400 font-bold tracking-wider uppercase text-sm mb-3">
            Workflow
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your growth engine in 3 steps
          </h3>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg">
            From zero to automated in under 5 minutes. No credit card, no
            complicated setup.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              {/* Connector dots between cards on desktop */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 z-10">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                  </div>
                </div>
              )}

              <div className="relative h-full p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 backdrop-blur overflow-hidden">
                {/* Step number */}
                <div className="absolute top-6 right-6 text-5xl font-black text-white/5 group-hover:text-white/10 transition-colors">
                  {step.number}
                </div>

                <div
                  className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} ring-1 ${step.ring} flex items-center justify-center mb-6 shadow-xl shadow-black/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                >
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                <h4 className="text-2xl font-bold text-white mb-3">
                  {step.title}
                </h4>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Mini visual preview per step */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  {i === 0 && (
                    <div className="flex gap-2">
                      <Chip icon="X" label="Twitter" ok />
                      <Chip icon={Camera} label="Instagram" ok />
                      <Chip icon={Briefcase} label="LinkedIn" />
                    </div>
                  )}
                  {i === 1 && (
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-white/10 w-full" />
                      <div className="h-2 rounded-full bg-white/10 w-4/5" />
                      <div className="h-2 rounded-full bg-gradient-to-r from-violet-500/60 to-transparent w-3/5" />
                    </div>
                  )}
                  {i === 2 && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-white">Tomorrow · 9:00 AM</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        Queued
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  label,
  ok = false,
}: {
  icon: React.ComponentType<{ className?: string }> | "X";
  label: string;
  ok?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${
        ok
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          : "bg-white/5 border-white/10 text-gray-400"
      }`}
    >
      {typeof Icon === "string" ? (
        <span className="font-black">𝕏</span>
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {label}
      {ok && <Check className="w-2.5 h-2.5" />}
    </div>
  );
}
