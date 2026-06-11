"use client";

/**
 * The Kinetic AI orb — a gradient orange-to-amber sphere with a soft pulse.
 * Used as the floating assistant trigger and the tutorial guide avatar.
 */
export function Orb({
  size = 56,
  pulse = true,
  className = "",
  onClick,
  label = "Rafiq assistant",
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { onClick, "aria-label": label, type: "button" as const } : { "aria-hidden": true })}
      className={`relative rounded-full shrink-0 ${pulse ? "orb-pulse" : ""} ${onClick ? "active:scale-95 transition-transform" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, #ffb955 0%, #ff6b00 45%, #da532c 75%, #b53f1a 100%)",
      }}
    >
      {/* Swirl mark */}
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 m-auto"
        style={{ width: size * 0.5, height: size * 0.5 }}
        fill="none"
        aria-hidden
      >
        <path
          d="M12 3a9 9 0 1 1-8.4 12.1"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M12 7.5a4.5 4.5 0 1 1-4.2 6"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="1.4" fill="white" />
      </svg>
    </Comp>
  );
}
