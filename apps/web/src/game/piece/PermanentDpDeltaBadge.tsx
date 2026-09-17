import { formatDpDelta } from "./formatDpDelta";

/** The DP chip a permanent wears while its current DP differs from its base. */
export function PermanentDpDeltaBadge({ delta }: { delta: number }) {
  return (
    <span
      style={{
        position: "absolute",
        right: -8,
        bottom: 16,
        zIndex: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "2px 5px",
        borderRadius: 6,
        background: delta < 0 ? "var(--ds-danger)" : "var(--ds-success)",
        color: delta < 0 ? "var(--ds-on-danger)" : "var(--ds-on-success)",
        fontFamily: "var(--ds-font-mono)",
        fontSize: 9.5,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">{delta < 0 ? "↓" : "↑"}</span>
      DP {formatDpDelta(Math.abs(delta))}
    </span>
  );
}
