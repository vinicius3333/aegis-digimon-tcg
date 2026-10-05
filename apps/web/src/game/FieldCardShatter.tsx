import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { CardMini } from "../design/cards";
import type { ColorName } from "../design/theme";
import { CardBurst } from "./CardBurst";
import { FIELD_FRACTURE, type FieldShatterFace } from "./fieldShatter";

export function FieldCardShatter({
  cardId,
  artId,
  color,
  face,
}: {
  cardId: string;
  artId?: string;
  color: ColorName;
  face: FieldShatterFace;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!face.clone || !ref.current) return;
    const copies = [...ref.current.querySelectorAll(".game-field-shatter__face")].map((slot) => {
      const clone = face.clone!.cloneNode(true) as HTMLElement;
      clone.inert = true;
      slot.append(clone);
      return clone;
    });
    return () => copies.forEach((clone) => clone.remove());
  }, [face]);
  return (
    <span ref={ref} className="game-field-shatter" aria-hidden="true">
      {FIELD_FRACTURE.map((shard, index) => (
        <span
          key={index}
          className="game-field-shatter__shard"
          style={
            {
              clipPath: shard.clipPath,
              "--field-shard-x": `${shard.driftX}%`,
              "--field-shard-y": `${shard.driftY}%`,
            } as CSSProperties
          }
        >
          <span className="game-field-shatter__face">
            {face.clone ? null : <CardMini cardId={cardId} artId={artId} width={face.width} zoomOnHover={false} />}
          </span>
        </span>
      ))}
      <CardBurst variant="evolve" color={color} className="game-field-shatter__light" />
    </span>
  );
}
