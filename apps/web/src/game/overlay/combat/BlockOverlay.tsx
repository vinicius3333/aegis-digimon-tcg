import { getCardDefinition } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { Sigil } from "../../../design/cards";
import { colorKey } from "../../../design/theme";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardLinkedText } from "../../cardLinks";
import { printedCardName } from "../printedCardName";

export function BlockOverlay({
  attackerCardId,
  blockers,
  mustBlock = false,
  onBlock,
  onDecline,
}: {
  attackerCardId?: string;
  blockers: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  /**
   * ＜Collision＞ (§16-30): the block is compulsory while a Digimon can make it, so the
   * window states the compulsion and drops the refusal the server would reject anyway.
   */
  mustBlock?: boolean;
  onBlock: (permanentId: string) => void;
  onDecline: () => void;
}) {
  const forced = mustBlock && blockers.length > 0;
  const { t } = useTranslation();
  return (
    <div
      className="combat-prompt"
      role="dialog"
      aria-modal="true"
      aria-label={t("overlay.blockWindow")}
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
          <Icons.Swords size={18} />
        </span>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--ds-font-display)",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--ds-fg)",
            }}
          >
            {t("overlay.blockWindow")}
            {forced ? (
              <span
                style={{
                  fontFamily: "var(--ds-font-mono)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--ds-warning-surface)",
                  color: "var(--ds-warning)",
                }}
              >
                {t("overlay.blockForced")}
              </span>
            ) : null}
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
        {t(forced ? "overlay.blockForcedPrompt" : "overlay.blockPrompt")}
      </div>
      {blockers.length ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {blockers.map((b) => {
            const def = getCardDefinition(b.cardId);
            const sourceLabel = t(b.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: b.sourceCount,
            });
            return (
              <button
                aria-label={`${printedCardName(b.cardId)}, ${b.currentDP.toLocaleString()} DP, ${sourceLabel}`}
                key={b.permanentId}
                onClick={() => onBlock(b.permanentId)}
                style={{
                  flex: "1 1 45%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: 9,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "var(--ds-surface-muted)",
                  border: "1.5px solid var(--ds-warning)",
                  textAlign: "left",
                }}
              >
                <Sigil cardId={b.cardId} color={colorKey(def?.colors[0])} size={26} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>
                    {printedCardName(b.cardId)}
                  </div>
                  <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11, color: "var(--ds-fg-muted)" }}>
                    {b.currentDP.toLocaleString()} DP
                  </div>
                  <div style={{ fontFamily: "var(--ds-font-mono)", fontSize: 10.5, color: "var(--ds-fg-muted)" }}>
                    {sourceLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noBlockers")}</div>
      )}
      {forced ? null : (
        <Button full variant="secondary" icon={Icons.Shield} onClick={onDecline}>
          {t("overlay.takeAttack")}
        </Button>
      )}
    </div>
  );
}
