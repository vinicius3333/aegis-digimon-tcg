import type { ReactNode } from "react";

export function Scrim({
  children,
  onClick,
  align = "center",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  align?: "center" | "flex-end";
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "var(--ds-scrim)",
        display: "flex",
        alignItems: align,
        justifyContent: "center",
        // A scrim covers the whole board, so it may only fade: a keyframe that also moved it
        // would slide the dimming off one edge and flash the board through the gap. The
        // panel it holds owns the entrance.
        animation: "game-modal-scrim-in 180ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
