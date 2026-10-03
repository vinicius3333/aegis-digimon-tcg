/* The free-floating cues the board plays over itself: a deleted card breaking apart
   where it stood, the small burst a drawn card lands with, and the cards flying
   from a deck to a hand. All three are positioned in board coordinates, which is why
   they live here rather than on the piece that caused them. */

import type { CSSProperties } from "react";
import { CardFull } from "../../../design/cards";
import { CardBurst } from "../../CardBurst";
import { CardShatter } from "../../CardShatterView";
import type { DeleteBurst, DrawBurst, DrawFlight } from "../../match/types";
import "../../style/playFlight.css";

/** Matches `--draw-flight-w` on `.game-draw-flight--face`; the stylesheet has the final say. */
const DRAW_FLIGHT_FACE_WIDTH = 60;

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
      {deleteBursts.map((burst) =>
        burst.stackStrip && burst.cardId ? (
          <span
            key={burst.key}
            aria-hidden="true"
            className="game-stack-strip-peel"
            style={{ left: burst.x, top: burst.y }}
          >
            <CardFull cardId={burst.cardId} artId={burst.artId} width={72} />
          </span>
        ) : (
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
        ),
      )}

      {drawBursts.map((burst) => (
        <span key={burst.key} aria-hidden="true" className="game-draw-burst" style={{ left: burst.x, top: burst.y }}>
          <CardBurst variant="draw" />
        </span>
      ))}

      {drawFlights.map((flight) => (
        <div
          key={flight.key}
          aria-hidden="true"
          data-testid={flight.kind === "play" ? "confirmed-play-flight" : undefined}
          data-card-id={flight.kind === "play" ? flight.card?.cardId : undefined}
          data-permanent-id={flight.targetPermanentId}
          className={`game-draw-flight${flight.card ? " game-draw-flight--face" : ""}${flight.kind === "play" ? " game-play-flight" : ""}`}
          style={
            {
              left: flight.x,
              top: flight.y,
              // The cue queue waits on this same number, so the card back is
              // never unmounted part-way across the board.
              "--t-draw-flight": `${flight.duration}ms`,
              "--battle-flight-dx": `${flight.dx}px`,
              "--battle-flight-dy": `${flight.dy}px`,
              ...(flight.kind === "play"
                ? {
                    "--play-from-width": `${flight.fromWidth}px`,
                    "--play-to-scale": (flight.toWidth ?? 88) / (flight.fromWidth ?? 100),
                  }
                : {}),
            } as CSSProperties
          }
        >
          {flight.card ? (
            <CardFull
              cardId={flight.card.cardId}
              artId={flight.card.artId}
              width={flight.kind === "play" ? flight.fromWidth : DRAW_FLIGHT_FACE_WIDTH}
              zoomOnHover={false}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}
