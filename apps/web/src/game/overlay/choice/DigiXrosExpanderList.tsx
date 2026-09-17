import { Icons } from "../../../design/icons";
import type { Translate } from "../../../i18n";
import { printedCardName } from "../printedCardName";
import type { DigiXrosEligibleExpander } from "../types";

/** Toggle list of expander Tamers the player may suspend to unlock a locked material zone. */
export function DigiXrosExpanderList({
  eligibleExpanders,
  chosenExpanderPermanentIds,
  onToggle,
  t,
}: {
  eligibleExpanders: DigiXrosEligibleExpander[];
  chosenExpanderPermanentIds: string[];
  onToggle: (permanentId: string) => void;
  t: Translate;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ds-fg-muted)",
        }}
      >
        {t("overlay.xrosExpanders")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {eligibleExpanders.map((e) => {
          const chosen = chosenExpanderPermanentIds.includes(e.permanentId);
          const maxParts = [
            e.trashMax > 0 ? t("overlay.xrosTrashMax", { count: e.trashMax }) : undefined,
            e.underTamerMax > 0 ? t("overlay.xrosUnderTamersMax", { count: e.underTamerMax }) : undefined,
          ].filter(Boolean);
          return (
            <button
              key={e.permanentId}
              onClick={() => onToggle(e.permanentId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                background: chosen ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
                border: `1.5px solid ${chosen ? "var(--ds-accent)" : "var(--ds-border)"}`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: chosen ? "var(--ds-accent)" : "var(--ds-border)",
                  color: chosen ? "#fff" : "var(--ds-fg-muted)",
                  flexShrink: 0,
                }}
              >
                {chosen ? <Icons.Check size={14} /> : null}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: "var(--ds-fg)" }}>
                {t("overlay.xrosSuspendToUnlock", {
                  name: printedCardName(e.cardId),
                  limits: maxParts.length ? t("overlay.xrosLimits", { limits: maxParts.join(", ") }) : "",
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
