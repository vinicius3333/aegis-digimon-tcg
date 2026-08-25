/* The reference client's timed side panels: titled navy cards listing what just
   moved, the opponent's stacking down from the top-right and the viewer's up
   from the bottom-right, each with a border that erodes clockwise over the time
   it has left. The panel contents come from ./sidePanels; this file only draws
   them. */

import { getCardDefinition } from "@aegis/shared";
import { CardMini } from "../design/cards";
import { useTranslation } from "../i18n";
import {
  sidePanelColumn,
  sidePanelRemaining,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelSide,
} from "./sidePanels";

const PANEL_CARD_WIDTH = 56;

function SidePanelView({
  panel,
  remainingMs,
  onDismiss,
}: {
  panel: SidePanel;
  remainingMs: number;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const title = t(panel.titleKey);
  return (
    <section className="side-panel" data-side={panel.side} data-testid="side-panel">
      {/* The clock a player can see: the border erodes clockwise over exactly the
          time this panel has left, so a short-lived one reads as short-lived. */}
      <span className="side-panel__erode" style={{ animationDuration: `${remainingMs}ms` }} aria-hidden="true" />
      <header className="side-panel__header">
        <h3 className="side-panel__title">{title}</h3>
        <span className="side-panel__owner">{t(panel.side === "you" ? "panel.yours" : "panel.opponents")}</span>
        <button
          className="side-panel__close"
          type="button"
          aria-label={t("panel.dismiss", { title })}
          onClick={() => onDismiss(panel.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <ol className="side-panel__cards">
        {panel.cards.map((card) => (
          <li className="side-panel__card" key={`${panel.id}:${card.badge}`}>
            <CardMini cardId={card.cardId} width={PANEL_CARD_WIDTH} zoomOnHover={false} />
            {/* Numbered only when the event put its cards in an order worth reading. */}
            {panel.ordered || panel.cards.length > 1 ? (
              <span className="side-panel__badge" aria-hidden="true">
                {card.badge}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SidePanelColumn({
  panels,
  side,
  nowMs,
  onDismiss,
}: {
  panels: readonly SidePanel[];
  side: SidePanelSide;
  nowMs: number;
  onDismiss: (id: string) => void;
}) {
  const column = sidePanelColumn(panels, side);
  if (column.length === 0) return null;
  return (
    // Deliberately not a live region: the opponent action feed already narrates
    // these moments, and a second status would announce every card twice.
    <div className="side-panel-stack" data-side={side} data-testid="side-panel-stack">
      {column.map((panel) => (
        <SidePanelView
          key={panel.id}
          panel={panel}
          remainingMs={sidePanelRemaining(panels, panel, nowMs)}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export function SidePanelStack({
  panels,
  nowMs,
  onDismiss,
}: {
  panels: readonly SidePanel[];
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  onDismiss: (id: string) => void;
}) {
  if (panels.length === 0) return null;
  const now = nowMs ?? Date.now();
  return (
    <>
      <SidePanelColumn panels={panels} side="opp" nowMs={now} onDismiss={onDismiss} />
      <SidePanelColumn panels={panels} side="you" nowMs={now} onDismiss={onDismiss} />
    </>
  );
}

export function AttackAnnouncementBanner({ announcement }: { announcement: AttackAnnouncement }) {
  const { t } = useTranslation();
  const name = getCardDefinition(announcement.cardId)?.nameEn ?? announcement.cardId;
  return (
    <div
      className="attack-announcement"
      data-side={announcement.side}
      data-testid="attack-announcement"
      key={announcement.id}
    >
      <CardMini cardId={announcement.cardId} width={44} zoomOnHover={false} />
      <strong className="attack-announcement__copy">{t("panel.attacking", { card: name })}</strong>
    </div>
  );
}
