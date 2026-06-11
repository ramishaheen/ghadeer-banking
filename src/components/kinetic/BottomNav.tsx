"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const ITEMS = [
  { href: "/rafiq/transfer", icon: "swap_horiz", label: "Payment", match: "/rafiq/transfer" },
  { href: "/", icon: "local_florist", label: "Home", match: "/" },
  { href: "/hub", icon: "grid_view", label: "Hub", match: "/hub" },
];

/** Kinetic bottom navigation: Payment / Home / Hub (per the design system). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-[420px] z-50 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] bg-surface-container-lowest flex justify-around items-center h-16 px-4 pb-safe">
      {ITEMS.map((item) => {
        const active =
          item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);
        return (
          <Link
            key={item.label}
            href={item.href}
            data-tut={`nav-${item.label.toLowerCase()}`}
            className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-all active:scale-95 ${
              active ? "text-primary font-bold" : "text-on-surface-variant"
            } hover:bg-surface-container`}
          >
            <Icon name={item.icon} filled={active} />
            <span className="font-label-sm text-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
