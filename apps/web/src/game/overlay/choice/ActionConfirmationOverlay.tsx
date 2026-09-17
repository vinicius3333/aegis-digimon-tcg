import { Button } from "../../../design/primitives";
import { CardFull } from "../../../design/cards";
import { useTranslation } from "../../../i18n";

export function ActionConfirmationOverlay({
  cardId,
  title,
  detail,
  confirmLabel,
  alternateLabel,
  onConfirm,
  onAlternate,
  onCancel,
}: {
  cardId: string;
  title: string;
  detail: string;
  confirmLabel: string;
  alternateLabel?: string;
  onConfirm: () => void;
  onAlternate?: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
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
        className="game-modal__panel action-confirmation"
        style={{
          width: 480,
          maxWidth: "calc(100% - 32px)",
          padding: 22,
          borderRadius: 20,
          background: "var(--ds-surface)",
          border: "2px solid var(--ds-accent)",
          boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
          <CardFull cardId={cardId} width={92} />
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "var(--ds-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 7, color: "var(--ds-fg)", fontSize: 15, lineHeight: 1.45 }}>{detail}</div>
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
      </div>
    </div>
  );
}
