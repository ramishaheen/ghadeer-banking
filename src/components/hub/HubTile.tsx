"use client";

import { Icon } from "@/components/Icon";

/**
 * Rounded-square service tile for the Hub grids (design 01): Material icon in
 * an orange/beige box, label below, optional badge chip floating on the corner.
 */
export function HubTile({
  label,
  icon,
  badge,
  bgClass = "bg-secondary-container",
  primary = false,
  onPress,
  dataTut,
  id,
}: {
  label: string;
  icon: string;
  badge?: string;
  bgClass?: string;
  /** Filled-primary variant (Stocks tile in the reference). */
  primary?: boolean;
  onPress: () => void;
  dataTut?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      data-tut={dataTut}
      onClick={onPress}
      className="flex flex-col items-center gap-2 group active:scale-95 transition-transform relative"
    >
      {badge && (
        <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
          {badge}
        </span>
      )}
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-shadow group-hover:shadow-md ${
          primary ? "bg-primary text-on-primary shadow-md" : `${bgClass} text-primary shadow-sm`
        }`}
      >
        <Icon name={icon} className="text-[32px]" />
      </div>
      <span className="font-label-sm text-label-sm text-center text-on-surface-variant leading-tight">
        {label}
      </span>
    </button>
  );
}
