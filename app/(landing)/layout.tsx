export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0a1a] min-h-screen text-white scroll-smooth">
      {children}
    </div>
  );
}
