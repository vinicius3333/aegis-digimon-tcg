import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CardFull } from "../../design/cards";
import type { EffectActivation } from "../effectSource";
import { TIMINGS } from "../timings";
import type { HandEntry } from "./types";
import { useHandFacePlane } from "./useHandFacePlane";

/** A source face leaves the clipped scroller; its physical hand slot stays put. */
export function HandSourceFocus({
  source,
  entry,
  row,
  onReady,
  selected = false,
  onPrepared,
}: {
  source: EffectActivation;
  entry: HandEntry;
  row: HTMLDivElement;
  onReady: (key: number) => void;
  selected?: boolean;
  onPrepared?: (key: number) => void;
}) {
  const plane = useHandFacePlane(row, entry.instanceId, { ensureVisible: true });
  const [alreadyLinked] = useState(source.linked === true);
  const [motionScale] = useState(source.motionScale ?? 1);
  useLayoutEffect(() => {
    if (!plane) return;
    onReady(source.key);
    if (alreadyLinked) onPrepared?.(source.key);
  }, [plane, onReady, onPrepared, source.key, alreadyLinked]);
  if (!plane) return null;
  return createPortal(
    <div
      className="game-hand-source-focus"
      aria-hidden="true"
      data-activation-key={source.key}
      data-instance-id={entry.instanceId}
      data-card-id={entry.cardId}
      data-linked={source.linked === true ? "true" : "false"}
      style={{ "--battle-arrow-effect": plane.color } as CSSProperties}
    >
      <div
        className={`game-hand-source-focus__anchor${alreadyLinked ? " game-hand-source-focus__anchor--settled" : ""}`}
        style={
          {
            left: plane.centerX - plane.width / 2,
            top: plane.centerY - plane.height / 2,
            width: plane.width,
            height: plane.height,
            "--hand-focus-safe-x": `${plane.safeX}px`,
            "--t-hand-focus-pivot": `${TIMINGS.effectHandPivot * motionScale}ms`,
            "--t-hand-focus-scale": `${TIMINGS.effectHandPreparation * motionScale}ms`,
            "--hand-focus-angle": `${plane.angle}deg`,
          } as CSSProperties
        }
      >
        <div className="game-hand-source-focus__rotation">
          <div
            className="game-hand-source-focus__scale"
            onAnimationEnd={(event) => {
              if (event.animationName === "battle-hand-focus-scale") onPrepared?.(source.key);
            }}
          >
            <div className="game-hand-source-focus__pivot">
              <CardFull
                cardId={entry.cardId}
                artId={entry.artId}
                width={plane.width}
                selected={selected}
                zoomOnHover={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
