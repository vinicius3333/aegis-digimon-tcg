import { Button } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import type { EvoCostOption } from "../../digivolveModel";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";

export function EvoCostChoiceOverlay({
  evolvingCardId,
  baseName,
  options,
  onConfirm,
  onCancel,
}: {
  evolvingCardId: string;
  baseName: string;
  options: readonly EvoCostOption[];
  /** Receives the whole path, not just "is it alternate": a card can print several alternate
   * paths at different costs, and only the path's own index tells the server which one. */
  onConfirm: (option: EvoCostOption) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="combat-prompt evo-cost-prompt"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: "50%",
        top: 120,
        transform: "translateX(-50%)",
        zIndex: 85,
        width: 420,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-accent)",
        borderRadius: 20,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 22,
        animation: "battle-dialog-in 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <CardArt cardId={evolvingCardId} width={56} />
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ds-accent)",
            }}
          >
            {t("overlay.digivolveCost")}
          </div>
          <div
            style={{
              fontFamily: "var(--ds-font-display)",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--ds-fg)",
              marginTop: 2,
            }}
          >
            {printedCardName(evolvingCardId)} → {baseName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {[...options]
          .sort((a, b) => a.cost - b.cost)
          .map((opt) => (
            <Button
              key={`${opt.type}:${opt.alternateRequirementIndex ?? -1}:${opt.label}`}
              full
              variant={opt.type === "alternate" ? "secondary" : "primary"}
              onClick={() => onConfirm(opt)}
            >
              {t("overlay.costMemory", { label: opt.label, cost: opt.cost })}
            </Button>
          ))}
      </div>

      <Button full variant="ghost" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
    </div>
  );
}
