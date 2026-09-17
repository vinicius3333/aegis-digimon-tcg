import { getCardDefinition } from "@aegis/shared";
import { Badge, Button } from "../../../design/primitives";
import { CardFull } from "../../../design/cards";
import { COLORS, colorKey } from "../../../design/theme";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardLink } from "../../cardLinks";
import { printedCardName } from "../printedCardName";

/**
 * ＜Alliance＞ (Comprehensive Rules §16-24): when this Digimon attacks, its controller
 * may suspend one of their OTHER Digimon to add its DP (and ＜Security A. +1＞) to the
 * attacker for the battle — an optional processing condition (§16-24-3).
 */
export function AllianceOverlay({
  triggerCardId,
  allies,
  onChoose,
  onPass,
}: {
  triggerCardId?: string;
  allies: { permanentId: string; cardId: string; currentDP: number; sourceCount: number }[];
  onChoose: (allyPermanentId: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const triggerName = triggerCardId ? printedCardName(triggerCardId) : t("overlay.yourDigimon");
  const kw = { label: "＜Alliance＞", icon: Icons.Users, action: t("overlay.allianceAction") };
  const sourceKey = colorKey(getCardDefinition(triggerCardId ?? "")?.colors[0]);

  return (
    <div
      className="combat-prompt"
      style={{
        position: "absolute",
        left: "50%",
        bottom: 232,
        transform: "translateX(-50%)",
        zIndex: 80,
        width: 520,
        maxWidth: "calc(100% - 32px)",
        background: "var(--ds-surface)",
        border: `2px solid ${COLORS[sourceKey].base}`,
        borderRadius: 18,
        boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
        padding: 20,
        animation: "battle-dialog-in 200ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            borderRadius: 11,
            flexShrink: 0,
            background: COLORS[sourceKey].soft,
            color: COLORS[sourceKey].base,
          }}
        >
          <kw.icon size={20} />
        </span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 17, color: "var(--ds-fg)" }}
            >
              {kw.label}
            </span>
            <Badge tone="primary">
              <Icons.Plus size={11} />
              {t("overlay.dpBoost")}
            </Badge>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", marginTop: 1 }}>
            {triggerCardId ? <CardLink cardId={triggerCardId} /> : triggerName} {kw.action}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-fg-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
        {t("overlay.alliancePrompt")}
      </div>
      {allies.length ? (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {allies.map((ally) => {
            const sourceLabel = t(ally.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
              count: ally.sourceCount,
            });
            return (
              <button
                key={ally.permanentId}
                onClick={() => onChoose(ally.permanentId)}
                aria-label={`${t("overlay.suspendAlly", { name: printedCardName(ally.cardId), dp: ally.currentDP.toLocaleString() })}, ${sourceLabel}`}
                style={{
                  position: "relative",
                  padding: 0,
                  border: "none",
                  borderRadius: 12,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <CardFull cardId={ally.cardId} width={104} />
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    right: 6,
                    bottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    padding: "3px 0",
                    borderRadius: 8,
                    background: "var(--ds-accent)",
                    color: "#fff",
                    fontFamily: "var(--ds-font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(15,23,42,0.35)",
                  }}
                >
                  <Icons.Plus size={12} />
                  {ally.currentDP.toLocaleString()} DP · {sourceLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)", marginBottom: 16 }}>{t("overlay.noAllies")}</div>
      )}
      <Button full variant="secondary" icon={Icons.ChevronRight} onClick={onPass}>
        {t("overlay.passAlliance")}
      </Button>
    </div>
  );
}
