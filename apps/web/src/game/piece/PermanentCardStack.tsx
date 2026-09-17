import { getCardDefinition, type CardInstance } from "@aegis/shared";
import { COLORS, colorKey } from "../../design/theme";

/**
 * The digivolution stack peeking out from under a permanent's top card, one
 * sliver per card underneath, cascading down and to the left (rules 4-8-1).
 * Tinted per card so a mixed-colour stack still reads at a glance.
 */
export function PermanentCardStack({ stack, width }: { stack: readonly CardInstance[]; width: number }) {
  return (
    <>
      {stack.map((ci, i) => {
        const sc = COLORS[colorKey(getCardDefinition(ci.cardId)?.colors[0])];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(-4px - ${i} * var(--arena-source-step, 4px))`,
              top: `calc(var(--arena-source-top, 6px) + ${i} * var(--arena-source-step, 4px))`,
              width,
              height: width * 1.4,
              borderRadius: 9,
              background: sc.soft,
              border: `1.5px solid ${sc.edge}66`,
              zIndex: 0,
            }}
          />
        );
      })}
    </>
  );
}
