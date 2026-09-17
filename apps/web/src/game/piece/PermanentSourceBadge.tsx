import { COLORS } from "../../design/theme";
import type { SourceCountBadge } from "../fieldBadges";
import { useTranslation } from "../../i18n";

/** The `×N` digivolution-source count, tinted by the permanent's top card. */
export function PermanentSourceBadge({ sources }: { sources: SourceCountBadge }) {
  const { t } = useTranslation();
  return (
    <span
      aria-label={t("game.digivolutionSources", { count: sources.count })}
      style={{
        position: "absolute",
        top: -7,
        left: -7,
        zIndex: 2,
        background: COLORS[sources.color].base,
        color: COLORS[sources.color].on,
        minWidth: 18,
        height: 18,
        padding: "0 4px",
        borderRadius: 9,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--ds-font-mono)",
        fontSize: 10,
        fontWeight: 700,
        boxShadow: "var(--ds-shadow-sm)",
      }}
    >
      ×{sources.count}
    </span>
  );
}
