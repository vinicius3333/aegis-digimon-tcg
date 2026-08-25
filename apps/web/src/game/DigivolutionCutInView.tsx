/* The full-screen cut-in (`EvolutionEffectObject.cs`): the card's art centre-screen
   over a band of its own colour sweeping across the screen, with "Digivolution"
   set across it in the display face. The DigiXros tier holds longer and shakes;
   the DNA tier flanks the result with the two cards that merged into it
   (`JogressEffectObject.cs:24`); the Burst tier holds longest and reads "Burst".

   Spectacle, nothing else: no text the player has to read, so reduced motion
   drops it and the queue can be told to skip it. Behind a setting, off by default
   (`areCutInsEnabled`), the way the reference client ships it. */

import type { CSSProperties } from "react";
import { CardFull } from "../design/cards";
import { COLORS } from "../design/theme";
import { useTranslation } from "../i18n";
import type { DigivolutionCutIn } from "./cutIn";

/** Bands that sweep behind the card, each one a little behind the last. */
const BAND_INDEXES = [0, 1, 2, 3];

export function DigivolutionCutInView({ cutIn }: { cutIn: DigivolutionCutIn }) {
  const { t } = useTranslation();
  const palette = COLORS[cutIn.color];
  return (
    <div
      className={`game-cut-in game-cut-in--${cutIn.tier}`}
      aria-hidden="true"
      style={{ "--cut-in-base": palette.base, "--cut-in-edge": palette.edge } as CSSProperties}
    >
      <span className="game-cut-in__bands">
        {BAND_INDEXES.map((index) => (
          <i key={index} style={{ "--cut-in-band": String(index) } as CSSProperties} />
        ))}
      </span>
      <span className="game-cut-in__card">
        {cutIn.sourceCardIds?.map((sourceCardId, index) => (
          <span
            className="game-cut-in__source"
            key={`${sourceCardId}-${index}`}
            data-slot={index === 0 ? "left" : "right"}
          >
            <CardFull cardId={sourceCardId} width={140} zoomOnHover={false} />
          </span>
        ))}
        <CardFull cardId={cutIn.cardId} width={240} zoomOnHover={false} />
      </span>
      <span className="game-cut-in__word">{t(cutIn.label)}</span>
    </div>
  );
}
