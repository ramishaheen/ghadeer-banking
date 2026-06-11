type IconProps = {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Material Symbols Outlined icon (the icon system used across all screens). */
export function Icon({ name, filled, className = "", style }: IconProps) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined select-none ${filled ? "symbol-filled" : ""} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
}
