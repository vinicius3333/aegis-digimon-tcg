import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardLinkedText } from "../../cardLinks";
import { printedCardName } from "../printedCardName";

/**
 * §11-3 Counter Timing: the non-turn (defending) player may activate at most 1
 * [Counter] effect for this attack (§11-3-2). Unlike ＜Alliance＞'s "choose one of
 * these permanents", the choice here is a (source card, effect) pair — a Digimon
 * can carry more than one [Counter] effect.
 */
export function CounterOverlay({
  attackerCardId,
  eligibleCounters,
  getCardId,
  onActivate,
  onPass,
}: {
  attackerCardId?: string;
  eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
  getCardId: (instanceId: string) => string | undefined;
  onActivate: (instanceId: string, effectKey: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 460,
        background: "var(--ds-surface)",
        border: "2px solid var(--ds-warning)",
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "battle-dialog-in 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--ds-warning-surface)",
            color: "var(--ds-warning)",
          }}
        >
          <Icons.Shield size={18} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 17, color: "var(--ds-fg)" }}>
            {t("overlay.counterTiming")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)" }}>
            {attackerCardId ? (
              <CardLinkedText
                text={t("overlay.isAttacking", { name: printedCardName(attackerCardId) })}
                cardIds={[attackerCardId]}
              />
            ) : (
              t("overlay.attackIncoming")
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", marginBottom: 12 }}>
        {t("overlay.counterPrompt")}
      </div>
      {eligibleCounters.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {eligibleCounters.map((c) => {
            const cardId = getCardId(c.instanceId);
            return (
              <button
                key={`${c.instanceId}-${c.effectKey}`}
                onClick={() => onActivate(c.instanceId, c.effectKey)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: 9,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "var(--ds-surface-muted)",
                  border: "1.5px solid var(--ds-warning)",
                  textAlign: "left",
                }}
              >
                {/* Inside the button that activates the counter, so the name cannot also be a
                    link — a button inside a button is invalid and unreachable by keyboard. */}
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>
                  {cardId ? printedCardName(cardId) : t("overlay.card")}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ds-fg-muted)" }}>{c.description}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noCounters")}</div>
      )}
      <Button full variant="secondary" icon={Icons.ChevronRight} onClick={onPass}>
        {t("overlay.passCounter")}
      </Button>
    </div>
  );
}
