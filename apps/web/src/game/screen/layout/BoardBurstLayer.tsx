/* The free-floating cues the board plays over itself: a deleted card breaking apart
   where it stood, the small burst a drawn card lands with, and the card backs flying
   from a deck to a hand. All three are positioned in board coordinates, which is why
   they live here rather than on the piece that caused them. */

import type { CSSProperties } from "react";
import { CardBurst } from "../../CardBurst";
import { CardShatter } from "../../CardShatterView";
import type { DeleteBurst, DrawBurst, DrawFlight } from "../../match/types";

export function BoardBurstLayer({
  deleteBursts,
  drawBursts,
  drawFlights,
}: {
  deleteBursts: readonly DeleteBurst[];
  drawBursts: readonly DrawBurst[];
  drawFlights: readonly DrawFlight[];
}) {
  return (
    <>
      {deleteBursts.map((burst) => (
        <span
          key={burst.key}
          aria-hidden="true"
          className={`game-delete-burst${burst.effectDeletion ? " game-delete-burst--effect" : ""}`}
          style={{ left: burst.x, top: burst.y }}
        >
          {/* The card's own art breaking apart where it stood, when the board still
              remembers which card that was; a plain burst otherwise. */}
          {burst.cardId ? (
            <CardShatter cardId={burst.cardId} artId={burst.artId} width={72} color={burst.color ?? "Neutral"} />
          ) : (
            <CardBurst variant="delete" />
          )}
        </span>
      ))}

      {drawBursts.map((burst) => (
        <span key={burst.key} aria-hidden="true" className="game-draw-burst" style={{ left: burst.x, top: burst.y }}>
          <CardBurst variant="draw" />
        </span>
      ))}

      {drawFlights.map((flight) => (
        <div
          key={flight.key}
          aria-hidden="true"
          className="game-draw-flight"
          style={
            {
              left: flight.x,
              top: flight.y,
              // The cue queue waits on this same number, so the card back is
              // never unmounted part-way across the board.
              "--t-draw-flight": `${flight.duration}ms`,
              "--battle-flight-dx": `${flight.dx}px`,
              "--battle-flight-dy": `${flight.dy}px`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}
