import type { Translate } from "../../../i18n";
import type { DigiXrosCandidate } from "../types";
import { DigiXrosCandidateGrid } from "./DigiXrosCandidateGrid";

/** One locked DigiXros zone (trash or under-Tamer): its unlock state, then its candidate grid. */
export function DigiXrosLockedZone({
  label,
  items,
  max,
  hasEligibleExpanders,
  eligibleCandidateIds,
  picks,
  pickedTrash,
  pickedUnderTamer,
  trashMax,
  underTamerMax,
  onToggle,
  t,
}: {
  label: string;
  items: DigiXrosCandidate[];
  max: number;
  hasEligibleExpanders: boolean;
  eligibleCandidateIds: Set<string>;
  picks: string[];
  pickedTrash: number;
  pickedUnderTamer: number;
  trashMax: number;
  underTamerMax: number;
  onToggle: (candidate: DigiXrosCandidate) => void;
  t: Translate;
}) {
  if (items.length === 0 || (max === 0 && !hasEligibleExpanders)) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: max > 0 ? "var(--ds-accent)" : "var(--ds-fg-muted)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 11,
            color: max > 0 ? "var(--ds-accent)" : "var(--ds-fg-muted)",
          }}
        >
          {max > 0 ? t("overlay.xrosZoneMax", { count: max }) : t("overlay.xrosZoneLocked")}
        </div>
      </div>
      {max > 0 ? (
        <DigiXrosCandidateGrid
          items={items}
          emptyText={t("overlay.xrosNoZoneMaterials", { zone: label.toLowerCase() })}
          eligibleCandidateIds={eligibleCandidateIds}
          picks={picks}
          pickedTrash={pickedTrash}
          pickedUnderTamer={pickedUnderTamer}
          trashMax={trashMax}
          underTamerMax={underTamerMax}
          onToggle={onToggle}
          t={t}
        />
      ) : (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--ds-surface-muted)",
            color: "var(--ds-fg-muted)",
            fontSize: 12.5,
          }}
        >
          {hasEligibleExpanders ? t("overlay.xrosUnlockHint") : t("overlay.xrosZoneLocked")}
        </div>
      )}
    </div>
  );
}
