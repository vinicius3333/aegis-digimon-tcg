import { getCardDefinition } from "@aegis/shared";
import type { Translate } from "../../../i18n";
import { CardArt } from "../CardArt";
import type { DigiXrosCandidate } from "../types";

/** Stable grid of DigiXros materials; candidates that cannot extend the current pick stay visible but disabled. */
export function DigiXrosCandidateGrid({
  items,
  emptyText,
  eligibleCandidateIds,
  picks,
  pickedTrash,
  pickedUnderTamer,
  trashMax,
  underTamerMax,
  onToggle,
  t,
}: {
  items: DigiXrosCandidate[];
  emptyText: string;
  eligibleCandidateIds: Set<string>;
  picks: string[];
  pickedTrash: number;
  pickedUnderTamer: number;
  trashMax: number;
  underTamerMax: number;
  onToggle: (candidate: DigiXrosCandidate) => void;
  t: Translate;
}) {
  const zoneLabel = (zone: DigiXrosCandidate["zone"]): string => t(`overlay.zone.${zone}` as const);
  return items.length === 0 ? (
    <div style={{ padding: "14px 0", textAlign: "center", fontSize: 13, color: "var(--ds-fg-disabled)" }}>
      {emptyText}
    </div>
  ) : (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 280, overflowY: "auto" }}>
      {items.map((c) => {
        const selected = picks.includes(c.instanceId);
        const def = getCardDefinition(c.cardId);
        const accessibleName = t("overlay.xrosMaterialLabel", {
          name: def?.nameEn ?? c.cardId,
          zone: zoneLabel(c.zone),
        });
        const zoneCount = c.zone === "trash" ? pickedTrash : c.zone === "underTamer" ? pickedUnderTamer : 0;
        const zoneMax = c.zone === "trash" ? trashMax : c.zone === "underTamer" ? underTamerMax : Infinity;
        const disabled = !selected && (!eligibleCandidateIds.has(c.instanceId) || zoneCount >= zoneMax);
        return (
          <button
            key={c.instanceId}
            onClick={() => !disabled && onToggle(c)}
            disabled={disabled}
            aria-label={accessibleName}
            aria-pressed={selected}
            title={accessibleName}
            style={{
              padding: 4,
              borderRadius: 10,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.45 : 1,
              filter: disabled ? "grayscale(0.6)" : "none",
              background: selected ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
              border: `2px solid ${selected ? "var(--ds-accent)" : "transparent"}`,
              transition: "background 100ms, border-color 100ms",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <CardArt cardId={c.cardId} artId={c.artId} width={72} />
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: selected ? "var(--ds-accent)" : "var(--ds-fg-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {zoneLabel(c.zone)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
