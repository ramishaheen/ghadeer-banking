"use client";

import { Icon } from "@/components/Icon";

/**
 * Kinetic top app bar: avatar + membership chip on the left, search and
 * notifications (with unread dot) on the right — per Accounts Overview design.
 */
export function TopBar({
  membership = "Standard",
  name,
  onSearch,
  onNotifications,
  notificationDot = true,
}: {
  membership?: string;
  name?: string;
  onSearch?: () => void;
  onNotifications?: () => void;
  notificationDot?: boolean;
}) {
  return (
    <header className="fixed top-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface flex justify-between items-center px-container-margin py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden active:scale-95 transition-transform duration-150">
          {/* Local avatar asset (initial-based) */}
          <span className="font-headline-md text-[16px] text-on-secondary-container font-bold">
            {(name ?? "A").slice(0, 1)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="bg-surface-container-high px-2 py-0.5 rounded-full font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {membership}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Search"
          onClick={onSearch}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150"
        >
          <Icon name="search" className="text-primary" />
        </button>
        <button
          aria-label="Notifications"
          onClick={onNotifications}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150 relative"
        >
          <Icon name="notifications" className="text-primary" />
          {notificationDot && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
          )}
        </button>
      </div>
    </header>
  );
}
