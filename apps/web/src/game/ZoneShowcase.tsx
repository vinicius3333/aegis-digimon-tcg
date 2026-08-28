/* The centre-screen card the board holds up when the opponent plays a card. A
   digivolution is left to the board itself, which shows the stack changing
   under its own burst. The reference client never flies a card between zone rectangles:
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

export function ZoneShowcase({ showcase }: { showcase: ZoneShowcaseModel }) {
  const { t } = useTranslation();
  const cardName = getCardDefinition(showcase.cardId)?.nameEn ?? showcase.cardId;
  const digivolving = showcase.kind === "digivolve";
  return (
    <div className="battle-showcase" data-testid="zone-showcase" role="status">
      <figure className="battle-showcase__frame">
        <span className="battle-showcase__halo" aria-hidden="true">
          <CardBurst variant={digivolving ? "evolve" : "play"} color={showcase.color} />
        </span>
        <div className="battle-showcase__art">
          <CardFull cardId={showcase.cardId} width={SHOWCASE_CARD_WIDTH} />
        </div>
        <figcaption className="battle-showcase__caption">
          {t(digivolving ? "showcase.opponentDigivolved" : "showcase.opponentPlayed", { card: cardName })}
        </figcaption>
      </figure>
    </div>
  );
}
