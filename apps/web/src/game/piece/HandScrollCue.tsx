import { Icons } from "../../design/icons";
import { useTranslation } from "../../i18n";

export function HandScrollCue({ direction, onClick }: { direction: "start" | "end"; onClick: () => void }) {
  const { t } = useTranslation();
  const Icon = direction === "start" ? Icons.ChevronLeft : Icons.ChevronRight;
  return (
    <button
      type="button"
      className={`game-hand-scroll-cue game-hand-scroll-cue--${direction}`}
      data-testid={direction === "start" ? "hand-scroll-start" : "hand-scroll-forward"}
      aria-label={t(direction === "start" ? "game.handScrollBack" : "game.handScrollForward")}
      onClick={onClick}
    >
      <Icon size={18} />
    </button>
  );
}
