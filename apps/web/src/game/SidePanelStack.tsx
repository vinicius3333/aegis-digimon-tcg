/* The reference client's timed side panels: titled navy cards listing what just
   moved, the opponent's stacking down from the top-right and the viewer's up
   from the bottom-right, each with a border that erodes clockwise over the time
   it has left. The panel contents come from ./sidePanels; this file only draws
   them. */

import type { ReactNode } from "react";
import { CardMini } from "../design/cards";
import { useTranslation } from "../i18n";
import { CardLink, CardLinkedText, cardDisplayName, useCardOpener } from "./cardLinks";
import {
  sidePanelColumn,
  sidePanelRemaining,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelCard,
  type SidePanelSide,
} from "./sidePanels";

const PANEL_CARD_WIDTH = 78;

/**
 * One card in a panel: its art, its number, and its name.
 *
 * The panel used to be art alone, which left a player unable to read what had
 * just been deleted — the art is small, and a phone has no hover to enlarge it.
 * The name is the link, so pointer and keyboard reach the card the same way; the
 * art is a second pointer target for the same card.
 */
function SidePanelCardView({ card, numbered }: { card: SidePanelCard; numbered: boolean }) {
  const openCard = useCardOpener();
  return (
    <li className="side-panel__card">
      <span className="side-panel__art" aria-hidden="true">
        <CardMini
          cardId={card.cardId}
          width={PANEL_CARD_WIDTH}
          zoomOnHover={false}
          onClick={openCard ? () => openCard(card.cardId) : undefined}
        />
        {/* Numbered only when the event put its cards in an order worth reading. */}
        {numbered ? <span className="side-panel__badge">{card.badge}</span> : null}
      </span>
      <CardLink cardId={card.cardId} className="side-panel__name" />
    </li>
  );
}

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
          time this panel has left, which nothing else on the board can shorten. */}
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
          <SidePanelCardView
            key={`${panel.id}:${card.badge}`}
            card={card}
            numbered={panel.ordered || panel.cards.length > 1}
          />
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
  tail,
  held,
  underSheet,
}: {
  panels: readonly SidePanel[];
  side: SidePanelSide | "all";
  nowMs: number;
  onDismiss: (id: string) => void;
  /** Rendered under the column's panels, and on its own when the column has none. */
  tail?: ReactNode;
  held?: boolean;
  underSheet?: boolean;
}) {
  const column = side === "all" ? [...panels].sort((a, b) => a.createdAt - b.createdAt) : sidePanelColumn(panels, side);
  if (column.length === 0 && tail === undefined) return null;
  return (
    // Deliberately not a live region: the opponent action feed already narrates
    // these moments, and a second status would announce every card twice.
    <div
      className="side-panel-stack"
      data-side={side}
      data-held={held || undefined}
      data-under-sheet={underSheet || undefined}
      data-testid="side-panel-stack"
    >
      {column.map((panel) => (
        <SidePanelView
          key={panel.id}
          panel={panel}
          remainingMs={sidePanelRemaining(panel, nowMs)}
          onDismiss={onDismiss}
        />
      ))}
      {tail}
    </div>
  );
}

export function SidePanelStack({
  panels,
  nowMs,
  onDismiss,
  oppColumnTail,
  collapse,
  held,
  underSheet,
}: {
  panels: readonly SidePanel[];
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  onDismiss: (id: string) => void;
  /**
   * Fold both sides into one column, oldest first, with the tail under all of them —
   * the portrait phone, where two anchored columns landed on each other.
   */
  collapse?: boolean;
  /**
   * What follows the opponent's panels down their column. The notices a security card
   * raises live here: the cards it revealed and the clause that revealed them are one
   * moment, read top to bottom, rather than two blocks anchored over each other.
   */
  oppColumnTail?: ReactNode;
  /** The clocks are stopped (a decision is waiting), so the eroding borders pause with them. */
  held?: boolean;
  /** A decision sheet is open under the column, which then keeps out of its way. */
  underSheet?: boolean;
}) {
  if (panels.length === 0 && oppColumnTail === undefined) return null;
  const now = nowMs ?? Date.now();
  const flags = { held, underSheet };
  if (collapse) {
    return (
      <SidePanelColumn panels={panels} side="all" nowMs={now} onDismiss={onDismiss} tail={oppColumnTail} {...flags} />
    );
  }
  return (
    <>
      <SidePanelColumn panels={panels} side="opp" nowMs={now} onDismiss={onDismiss} tail={oppColumnTail} {...flags} />
      <SidePanelColumn panels={panels} side="you" nowMs={now} onDismiss={onDismiss} {...flags} />
    </>
  );
}

export function AttackAnnouncementBanner({ announcement }: { announcement: AttackAnnouncement }) {
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const { cardId } = announcement;
  return (
    <div
      className="attack-announcement"
      data-side={announcement.side}
      data-testid="attack-announcement"
      key={announcement.id}
    >
      <span aria-hidden="true">
        <CardMini
          cardId={cardId}
          width={44}
          zoomOnHover={false}
          onClick={openCard ? () => openCard(cardId) : undefined}
        />
      </span>
      <strong className="attack-announcement__copy">
        <CardLinkedText text={t("panel.attacking", { card: cardDisplayName(cardId, t) })} cardIds={[cardId]} />
      </strong>
    </div>
  );
}
