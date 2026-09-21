import { Button } from "../../../design/primitives";
import { CardFull } from "../../../design/cards";
import { useTranslation } from "../../../i18n";
import { useEffectPromptFocus } from "./useEffectPromptFocus";
import { useBoardPreview } from "./useBoardPreview";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";
import "../effectPromptFamily.css";

export function ActionConfirmationOverlay({
  cardId,
  title,
  titleTone,
  detail,
  confirmLabel,
  alternateLabel,
  onConfirm,
  onAlternate,
  onCancel,
}: {
  cardId: string;
  title: string;
  titleTone?: "keyword";
  detail: string;
  confirmLabel: string;
  alternateLabel?: string;
  onConfirm: () => void;
  onAlternate?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const focusProps = useEffectPromptFocus(isViewingBoard);
  if (isViewingBoard) return boardReturn;
  return (
    <div
      className="game-modal"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 86,
        display: "grid",
        placeItems: "center",
        background: "rgba(15,23,42,0.42)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        {...focusProps}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="game-modal__panel action-confirmation effect-prompt-family"
        style={{
          width: 480,
          maxWidth: "calc(100% - 32px)",
          padding: 22,
          borderRadius: 18,
          background: "var(--ds-surface)",
          border: "2px solid var(--ds-accent)",
          boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
          <CardFull cardId={cardId} width={92} />
          <div className="action-confirmation__copy">
            <div className="action-confirmation__title" data-tone={titleTone}>
              {title}
            </div>
            <div className="action-confirmation__detail">{detail}</div>
          </div>
        </div>
        <div className="game-actions-row">
          <Button full onClick={onConfirm}>
            {confirmLabel}
          </Button>
          {alternateLabel && onAlternate ? (
            <Button full variant="secondary" onClick={onAlternate}>
              {alternateLabel}
            </Button>
          ) : null}
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
        <div className="effect-prompt-family__board-action">
          <DecisionViewBoardButton onOpenBoard={openBoard} />
        </div>
      </div>
    </div>
  );
}
