import { useState, type CSSProperties } from "react";
import { CardBack, CardFull } from "../design/cards";
import { DrawLight } from "./DrawLight";
import type { DrawFlight } from "./match/types";
import { useHandArrivalArt } from "./piece/useHandArrivalArt";
import { Side } from "./side";
import { DRAW_PRESENTATION_GEOMETRY } from "./drawPresentationModel";

/** A temporary deck-side face; its actual physical card joins the existing hand later. */
export function DrawPresentation({ flight }: { flight: DrawFlight }) {
  const presentation = flight.presentation!;
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const key = `draw-art-${flight.key}`;
  const ready = useHandArrivalArt(root, new Set([key])).has(key);
  const viewer = presentation.side === Side.Viewer;
  return (
    <div
      ref={setRoot}
      aria-hidden="true"
      data-draw-presentation-key={flight.key}
      data-draw-instance-id={presentation.instanceId}
      data-draw-ready={ready}
      data-side={presentation.side}
      className={`game-draw-presentation${viewer ? " game-draw-presentation--viewer" : ""}${ready ? " game-draw-presentation--ready" : ""}`}
      style={
        {
          left: flight.x,
          top: flight.y,
          width: presentation.width,
          height: presentation.width * 1.4,
          "--t-draw-presentation": `${flight.duration}ms`,
          "--draw-entry-x": `${-presentation.inward * DRAW_PRESENTATION_GEOMETRY.entryWidths * 100}%`,
          "--draw-entry-y": viewer ? `${-DRAW_PRESENTATION_GEOMETRY.viewerEntryHeights * 100}%` : "0%",
          "--draw-exit-y": viewer ? "-396.825397%" : "-301.587302%",
        } as CSSProperties
      }
    >
      {viewer ? <DrawLight inward={presentation.inward} /> : null}
      <div className="game-draw-presentation__face" data-hand-instance-id={key}>
        {flight.card ? (
          <CardFull
            cardId={flight.card.cardId}
            artId={flight.card.artId}
            width={presentation.width}
            zoomOnHover={false}
          />
        ) : (
          <CardBack width={presentation.width} />
        )}
        <span className="game-draw-presentation__wash" />
      </div>
    </div>
  );
}
