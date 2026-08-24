/* The reference client's transient card-information panels: a right-side stack of small navy
   panels with a gradient header, opened whenever cards are discarded, deleted,
   revealed or played, plus the brief attack call-out that accompanies the arc
   and lunge. The panel contents come from ./infoPanels; this file only draws
   them. */

import { getCardDefinition } from "@aegis/shared";
import { CardMini } from "../design/cards";
import { useTranslation } from "../i18n";
import { orderInfoPanels, type AttackAnnouncement, type InfoPanel } from "./infoPanels";

const PANEL_CARD_WIDTH = 56;

function InfoPanelView({ panel, onDismiss }: { panel: InfoPanel; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const title = t(panel.titleKey);
  return (
    <section className="info-panel" data-side={panel.side} data-testid="info-panel">
      <header className="info-panel__header">
        <h3 className="info-panel__title">{title}</h3>
        <span className="info-panel__owner">{t(panel.side === "you" ? "panel.yours" : "panel.opponents")}</span>
        <button
          className="info-panel__close"
          type="button"
          aria-label={t("panel.dismiss", { title })}
          onClick={() => onDismiss(panel.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <ol className="info-panel__cards">
        {panel.cards.map((card) => (
          <li className="info-panel__card" key={`${panel.id}:${card.badge}`}>
            <CardMini cardId={card.cardId} width={PANEL_CARD_WIDTH} zoomOnHover={false} />
            {/* The reference client numbers the cards only once there is more than one to order. */}
            {panel.cards.length > 1 ? (
              <span className="info-panel__badge" aria-hidden="true">
                {card.badge}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InfoPanelStack({
  panels,
  onDismiss,
}: {
  panels: readonly InfoPanel[];
  onDismiss: (id: string) => void;
}) {
  if (panels.length === 0) return null;
  return (
    // Deliberately not a live region: the opponent action feed already narrates
    // these moments, and a second status would announce every card twice.
    <div className="info-panel-stack" data-testid="info-panel-stack">
      {orderInfoPanels(panels).map((panel) => (
        <InfoPanelView key={panel.id} panel={panel} onDismiss={onDismiss} />
      ))}
    </div>
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
