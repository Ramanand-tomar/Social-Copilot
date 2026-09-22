import Link from "next/link";
import { PlusCircle, X, Camera, Briefcase, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-20 border-t border-white/5 bg-[#0a0a1a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <PlusCircle className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">SocialCopilot</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Empowering creators and brands to master the social game with AI-driven automation and deep analytics.
            </p>
            <div className="flex items-center gap-4">
              <Link href="https://x.com" aria-label="X (Twitter)" className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </Link>
              <Link href="https://instagram.com" aria-label="Instagram" className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <Camera className="w-4 h-4 text-gray-400" />
              </Link>
              <Link href="https://linkedin.com" aria-label="LinkedIn" className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <Briefcase className="w-4 h-4 text-gray-400" />
              </Link>
              <Link href="https://social-copilot-ten.vercel.app" aria-label="Official Website" className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <Globe className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Product</h5>
            <ul className="space-y-4">
              <li><Link href="#features" className="text-gray-400 text-sm hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-gray-400 text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/accounts" className="text-gray-400 text-sm hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/api/health" className="text-gray-400 text-sm hover:text-white transition-colors">API Health</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Company</h5>
            <ul className="space-y-4">
              <li><Link href="/" className="text-gray-400 text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/" className="text-gray-400 text-sm hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Legal</h5>
            <ul className="space-y-4">
              <li><Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 text-sm hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} SocialCopilot Inc. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="/api/health" className="text-gray-500 text-xs hover:text-white">Status</Link>
            <Link href="/privacy" className="text-gray-500 text-xs hover:text-white">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
