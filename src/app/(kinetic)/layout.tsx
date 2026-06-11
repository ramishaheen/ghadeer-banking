export default function KineticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="kinetic" className="min-h-dvh">
      {children}
    </div>
  );
}
