import { useState } from "react";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { EffectQueueZone } from "@aegis/shared/protocol/EffectQueueZone";
import { useMediaQuery } from "@/design/useMediaQuery";
import { Icons } from "@/design/icons";
import type { Seat } from "@aegis/shared";
import { getEffectOrderLabel } from "@/game/effectOrder/getEffectOrderLabel";
import { getEffectOrderStep } from "@/game/effectOrder/getEffectOrderStep";
import { printedTimingLabel } from "@/game/overlay/effectText";
import { CardRulings } from "@/game/rulings/CardRulings";
import { useTranslatedCardName } from "@/i18n/useTranslatedCardName";
import { useTranslation } from "@/i18n/useTranslation";
import "@/game/effectOrder/effectOrderBadge.css";
import "@/game/effectOrder/effectOrderPanel.css";

type Props = {
  entries: readonly EffectQueueEntry[];
  viewerSeat: Seat;
};

const PHONE_QUERY = "(max-width: 640px)";

function getZoneLabelKey(entry: EffectQueueEntry) {
  return Object.values(EffectQueueZone).find((zone) => zone.value === entry.sourceZone)?.label;
}

export function EffectOrderPanel({ entries, viewerSeat }: Props) {
  const { t } = useTranslation();
  const getCardName = useTranslatedCardName();
  const phone = useMediaQuery(PHONE_QUERY);
  const [expanded, setExpanded] = useState<boolean>();
  if (entries.length === 0) {
    return null;
  }
  const open = expanded ?? !phone;
  const resolving = entries.find((entry) => entry.isResolving);
  const resolvingCardId = entries.find((entry) => entry.isResolving)?.sourceCardId;
  return (
    <aside
      className="effect-order-panel"
      aria-label={t("effectOrder.title")}
      data-testid="effect-order-panel"
      data-expanded={open || undefined}
    >
      <button
        type="button"
        className="effect-order-panel__toggle"
        aria-expanded={open}
        aria-controls="effect-order-list"
        onClick={() => setExpanded(!open)}
      >
        <span className="effect-order-panel__title">{t("effectOrder.title")}</span>
        <span className="effect-order-panel__summary">
          {t("effectOrder.count", { count: entries.length })}
          {resolving?.sourceCardId === undefined || open
            ? ""
            : ` · ${t("effectOrder.resolving")}: ${getCardName(resolving.sourceCardId)}`}
        </span>
        {open ? <Icons.ChevronUp size={16} aria-hidden="true" /> : <Icons.ChevronDown size={16} aria-hidden="true" />}
      </button>
      {open ? (
        <ol id="effect-order-list" className="effect-order-panel__list">
          {entries.map((entry, index) => {
            const label = getEffectOrderLabel({ entry, t });
            return (
              <li
                key={`${index}-${entry.position}`}
                className="effect-order-panel__entry"
                data-resolving={entry.isResolving || undefined}
                data-side={entry.seat === viewerSeat ? "viewer" : "opponent"}
                aria-label={label}
              >
                <span
                  className="game-effect-order-badge"
                  data-resolving={entry.isResolving || undefined}
                  data-unordered={entry.lastPosition !== undefined || undefined}
                  aria-hidden="true"
                >
                  {getEffectOrderStep(entry)}
                </span>
                <span className="effect-order-panel__source">
                  <span className="effect-order-panel__name">
                    {entry.sourceCardId === undefined ? t("effectOrder.hiddenSource") : getCardName(entry.sourceCardId)}
                  </span>
                  <span className="effect-order-panel__meta">
                    {entry.seat === viewerSeat ? t("game.you") : t("game.opponent")}
                    {printedTimingLabel(entry.timing) ? ` · ${printedTimingLabel(entry.timing)}` : ""}
                    {getZoneLabelKey(entry) === undefined ? "" : ` · ${t(getZoneLabelKey(entry)!)}`}
                    {entry.isResolving ? ` · ${t("effectOrder.resolving")}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {open ? (
        <details className="effect-order-panel__rulings" data-testid="effect-order-rulings">
          <summary>{resolvingCardId === undefined ? t("rulings.effectOrderRules") : t("effectOrder.rulings")}</summary>
          <CardRulings key={resolvingCardId ?? "order"} cardId={resolvingCardId} showEffectOrder />
        </details>
      ) : null}
    </aside>
  );
}
