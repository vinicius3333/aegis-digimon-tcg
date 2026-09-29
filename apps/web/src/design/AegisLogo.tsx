import type { CSSProperties } from "react";
import "./AegisLogo.css";

const EMBLEM_SRC = "/branding/aegis-emblem.png";

/** The pixel-egg emblem. Decorative: the surrounding control carries the name. */
export function AegisEmblem({ size, className }: { size?: number; className?: string }) {
  return (
    <img
      src={EMBLEM_SRC}
      alt=""
      className={className ? `aegis-emblem ${className}` : "aegis-emblem"}
      style={size ? ({ "--aegis-logo-size": `${size}px` } as CSSProperties) : undefined}
    />
  );
}

/**
 * Emblem plus the AEGIS wordmark. `on-ink` is for the navy header,
 * `on-surface` for ordinary page surfaces. Size follows `--aegis-logo-size`
 * (56px on wide screens, 36px below 960px) unless `size` sets the emblem height.
 */
export function AegisLogo({
  size,
  tone = "on-ink",
  className,
}: {
  size?: number;
  tone?: "on-ink" | "on-surface";
  className?: string;
}) {
  return (
    <span
      className={className ? `aegis-brand-logo ${className}` : "aegis-brand-logo"}
      data-tone={tone}
      style={size ? ({ "--aegis-logo-size": `${size}px` } as CSSProperties) : undefined}
    >
      <AegisEmblem />
      <span className="aegis-brand-logo__wordmark">AEGIS</span>
    </span>
  );
}
