import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { getEffectOrderLabel } from "@/game/effectOrder/getEffectOrderLabel";
import { getEffectOrderStep } from "@/game/effectOrder/getEffectOrderStep";
import { useTranslation } from "@/i18n/useTranslation";
import "@/game/effectOrder/effectOrderBadge.css";

type Props = { entries: readonly EffectQueueEntry[] };

export function PermanentEffectOrderBadges({ entries }: Props) {
  const { t } = useTranslation();
  return (
    <span className="game-permanent__effect-order" data-testid="effect-order-badges">
      {entries.map((entry) => {
        const label = getEffectOrderLabel({ entry, t });
        return (
          <span
            key={`${entry.position}-${entry.timing ?? ""}-${entry.isInherited ? "inherited" : "own"}`}
            className="game-effect-order-badge"
            data-resolving={entry.isResolving || undefined}
            data-unordered={entry.lastPosition !== undefined || undefined}
            role="img"
            aria-label={label}
            title={label}
          >
            {getEffectOrderStep(entry)}
            {entry.isResolving ? (
              <span className="game-effect-order-badge__now">{t("effectOrder.resolving")}</span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
