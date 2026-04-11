import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Which platforms does SocialCopilot support?",
    answer: "Currently, we offer full support for X (Twitter), LinkedIn, and Instagram. We are actively working on adding support for Facebook, Threads, and TikTok in the coming months.",
  },
  {
    question: "How does the AI post generation work?",
    answer: "Our AI uses Google's Gemini Pro models fine-tuned on millions of high-performing social media posts. It analyzes your brand description, voice guidelines, and specific topic prompts to generate content that's designed to drive engagement.",
  },
  {
    question: "Is my social login info safe?",
    answer: "Absolutely. We never store your passwords. We use official OAuth 2.0 flows provided by the platforms, giving us only the specific permissions needed to post and analyze on your behalf. You can revoke access at any time.",
  },
  {
    question: "Can I schedule multi-image or video posts?",
    answer: "Yes! SocialCopilot supports multi-image carousels for Instagram and LinkedIn, as well as video uploads for all supported platforms, including automated thumbnail generation.",
  },
  {
    question: "What happens if a post fails to send?",
    answer: "We'll notify you immediately via email and the in-app notification bell. You can review the failure reason (e.g., API downtime or expired tokens) and retry with one click.",
  },
  {
    question: "Is there a limit to how many AI posts I can generate?",
    answer: "Starter plans have a monthly limit, while Pro and Enterprise plans offer unlimited AI generation. All plans include our basic 'Smart Draft' feature to help you Polish your own writing.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 max-w-4xl mx-auto px-6">
      <div className="text-center mb-16 px-6">
        <h2 className="text-violet-500 font-bold tracking-wider uppercase text-sm mb-3">Questions?</h2>
        <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">Common inquiries</h3>
      </div>

      <Accordion className="w-full space-y-4">
        {faqs.map((faq, i) => (
          <AccordionItem 
            key={i} 
            value={`item-${i}`}
            className="border border-white/10 bg-white/5 rounded-2xl px-6 transition-colors hover:bg-white/[0.08]"
          >
            <AccordionTrigger className="text-white hover:no-underline font-semibold py-6">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-400 pb-6 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
