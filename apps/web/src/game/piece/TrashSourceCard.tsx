import { useState } from "react";
import { CardMini } from "../../design/cards";
import type { TrashEffectCard } from "../effectSource";
import { EFFECT_SPEED_SCALE, getEffectSpeed } from "../pacing";
import { TIMINGS } from "../timings";
import type { CSSProperties } from "react";

/** An occurrence owns its complete animation across the announcing-to-reading handoff. */
export function TrashSourceCard({ card, width }: { card: TrashEffectCard; width: number }) {
  // Revisiting an older visible clause should show its settled source, never replay its punch.
  const [alreadyLinked] = useState(card.linked === true);
  const [motionScale] = useState(() => card.motionScale ?? EFFECT_SPEED_SCALE[getEffectSpeed()]);
  return (
    <div
      className={`game-pile__effect-card${alreadyLinked ? " game-pile__effect-card--settled" : ""}`}
      aria-hidden="true"
      data-card-id={card.cardId}
      data-instance-id={card.instanceId}
      data-activation-key={card.key}
      data-linked={card.linked === true ? "true" : "false"}
      style={{ "--t-effect-trash-rise": `${TIMINGS.effectTrashRise * motionScale}ms` } as CSSProperties}
    >
      <CardMini cardId={card.cardId} artId={card.artId} width={width} zoomOnHover={false} />
    </div>
  );
}
