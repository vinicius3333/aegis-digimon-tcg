import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { CardMini } from "../design/cards";
import type { DrawFlight } from "./match/types";

/** The full physical stack keeps its orientation; arrival removes it without fading. */
export function HandReturnFlight({ flight }: { flight: DrawFlight }) {
  const host = useRef<HTMLDivElement>(null);
  const face = flight.handReturn!;
  const snapshot = face.handStackClone ?? face.stackClone;
  useLayoutEffect(() => {
    const slot = host.current;
    if (!slot || !snapshot) return;
    const clone = snapshot.cloneNode(true) as HTMLElement;
    clone.inert = true;
    slot.append(clone);
    return () => clone.remove();
  }, [snapshot]);
  return (
    <div
      className="game-hand-return"
      data-hand-return={flight.key}
      data-card-id={flight.card?.cardId}
      data-permanent-id={face.permanentId}
      aria-hidden="true"
      style={
        {
          left: flight.x - face.width / 2,
          top: flight.y - face.height / 2,
          width: face.width,
          height: face.height,
          "--t-hand-return": `${flight.duration}ms`,
          "--hand-return-dx": `${flight.dx}px`,
          "--hand-return-dy": `${flight.dy}px`,
          "--hand-return-scale": face.targetScale,
        } as CSSProperties
      }
    >
      <div ref={host} className="game-hand-return__stack" style={{ rotate: snapshot ? undefined : `${face.angle}deg` }}>
        {snapshot ? null : (
          <CardMini cardId={flight.card?.cardId} artId={flight.card?.artId} width={face.width} zoomOnHover={false} />
        )}
      </div>
    </div>
  );
}
