/* The centre-screen card the board holds up when the opponent plays or
   digivolves. The reference client never flies a card between zone rectangles:
   the source is hidden, the card is shown large in the middle of the screen, and
   only then does it appear in its destination (battle-animation-spec.md §3 and
   the cross-cutting notes). This is that middle beat.

   Decoration with a caption: it takes no pointer input, and the queue owns how
   long it stays. */

import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { useTranslation } from "../i18n";
import { CardBurst } from "./CardBurst";
import type { ZoneShowcase as ZoneShowcaseModel } from "./showcases";

const SHOWCASE_CARD_WIDTH = 190;

const CAPTION_KEYS = {
  play: "showcase.opponentPlayed",
  digivolve: "showcase.opponentDigivolved",
} as const;

export function ZoneShowcase({ showcase }: { showcase: ZoneShowcaseModel }) {
  const { t } = useTranslation();
  const cardName = getCardDefinition(showcase.cardId)?.nameEn ?? showcase.cardId;
  return (
    <div className="battle-showcase" data-testid="zone-showcase" data-kind={showcase.kind} role="status">
      <figure className="battle-showcase__frame">
        <span className="battle-showcase__halo" aria-hidden="true">
          <CardBurst variant={showcase.kind === "digivolve" ? "evolve" : "play"} color={showcase.color} />
        </span>
        <div className="battle-showcase__art">
          <CardFull cardId={showcase.cardId} width={SHOWCASE_CARD_WIDTH} />
        </div>
        <figcaption className="battle-showcase__caption">
          {t(CAPTION_KEYS[showcase.kind], { card: cardName })}
        </figcaption>
      </figure>
    </div>
  );
}
