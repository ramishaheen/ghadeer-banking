"use client";

import { Icon } from "@/components/Icon";

/** Skeleton block matching layout dimensions (no generic spinners, per design). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

export function ScreenSkeleton() {
  return (
    <div className="px-container-margin pt-20 space-y-4" data-testid="screen-skeleton">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-container-margin py-16 flex flex-col items-center text-center gap-3" role="alert">
      <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
        <Icon name="error" className="text-on-error-container" />
      </div>
      <p className="font-headline-md text-headline-md-mobile text-on-surface">Something went wrong</p>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-[28ch]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-2.5 bg-primary text-on-primary font-bold rounded-full text-label-sm active:scale-95 transition-transform"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-container-margin py-14 flex flex-col items-center text-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center">
        <Icon name={icon} className="text-on-secondary-container text-[28px]" />
      </div>
      <p className="font-headline-md text-headline-md-mobile text-on-surface">{title}</p>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-[30ch]">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-6 py-2.5 bg-primary text-on-primary font-bold rounded-full text-label-sm active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
