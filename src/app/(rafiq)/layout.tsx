export default function RafiqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="rafiq" className="min-h-dvh relative overflow-hidden">
      {/* Kinetic glow — soft blurred orange orb lifting the AI surface */}
      <div className="kinetic-glow glow-breathe pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
