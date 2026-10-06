import type { ButtonHTMLAttributes } from "react";
import { useTranslation } from "../../../i18n";

export function DecisionReorderHandle({
  position,
  onMove,
  onCancel,
  ...pointerProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  position: number;
  onMove: (delta: -1 | 1) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      {...pointerProps}
      type="button"
      className="decision-reorder-handle"
      aria-label={t("overlay.reorderItem", { position })}
      title={t("overlay.reorderHelp")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }
      }}
    >
      <svg width="18" height="24" viewBox="0 0 18 24" fill="currentColor" aria-hidden="true">
        <circle cx="6" cy="6" r="1.5" />
        <circle cx="12" cy="6" r="1.5" />
        <circle cx="6" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="6" cy="18" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
      </svg>
    </button>
  );
}
