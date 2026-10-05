import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { CardMini } from "../design/cards";
import type { DrawFlight } from "./match/types";

/** The departing permanent remains full size; only its printed face survives arrival. */
export function DeckReturnFlight({ flight }: { flight: DrawFlight }) {
  const host = useRef<HTMLDivElement>(null);
  const face = flight.deckReturn!;
  useLayoutEffect(() => {
    const slot = host.current;
    if (!slot || !face.stackClone) return;
    const clone = face.stackClone.cloneNode(true) as HTMLElement;
    clone.inert = true;
    const printed = clone.querySelector<HTMLElement>("[data-deck-return-face]")!;
    printed.style.animation =
      "battle-deck-return-fade var(--t-deck-return, 410ms) cubic-bezier(0.333333, 0.666667, 0.666667, 1) both";
    for (const extra of clone.querySelectorAll<HTMLElement>("[data-deck-return-extra]")) {
      extra.style.animation = "battle-deck-return-extra var(--t-deck-return, 410ms) linear both";
    }
    slot.append(clone);
    return () => clone.remove();
  }, [face]);
  return (
    <div
      ref={host}
      className="game-deck-return"
      data-deck-return={flight.key}
      data-card-id={flight.card?.cardId}
      data-permanent-id={face.permanentId}
      aria-hidden="true"
      style={
        {
          left: flight.x - face.width / 2,
          top: flight.y - face.height / 2,
          width: face.width,
          height: face.height,
          "--t-deck-return": `${flight.duration}ms`,
          "--deck-return-dx": `${flight.dx}px`,
          "--deck-return-dy": `${flight.dy}px`,
        } as CSSProperties
      }
    >
      {face.stackClone ? null : (
        <div className="game-deck-return__fallback">
          <CardMini cardId={flight.card?.cardId} artId={flight.card?.artId} width={face.width} zoomOnHover={false} />
        </div>
      )}
    </div>
  );
}
