/* A battle's loser has already left the live state, so a ghost of its card stands
   where it stood, takes the lunge or the claw, and hands the spot to the shatter burst
   when the scene ends. Combatants still on the board play the same beats on their own
   PermanentView instead, which is why a ghost is drawn only for a permanent whose
   element has left the document. */

import type { RefObject } from "react";
import { CardFull } from "../../../design/cards";
import { ClawSlash } from "../../piece";
import type { AttackLunge } from "../../match/types";
import type { FieldClashScene } from "../../fieldClash";
import { FIELD_CLASH_GHOST_HEIGHT, FIELD_CLASH_GHOST_WIDTH } from "../constants";

export function FieldClashGhosts({
  scene,
  permanentRefs,
  permanentCenters,
  permanentCardIds,
  combatImpactIds,
  attackLunge,
}: {
  scene: FieldClashScene | null;
  permanentRefs: RefObject<Record<string, HTMLDivElement | null>>;
  permanentCenters: RefObject<Record<string, { x: number; y: number }>>;
  permanentCardIds: RefObject<Record<string, string>>;
  combatImpactIds: ReadonlySet<string>;
  attackLunge: AttackLunge | null;
}) {
  if (!scene) return null;
  return (
    <>
      {[scene.attacker, scene.defender].flatMap((combatant) => {
        if (permanentRefs.current[combatant.permanentId]?.isConnected) return [];
        const center = permanentCenters.current[combatant.permanentId];
        const cardId = combatant.cardId ?? permanentCardIds.current[combatant.permanentId];
        if (!center || !cardId) return [];
        const struck = combatImpactIds.has(combatant.permanentId);
        return [
          <span
            key={`clash-ghost-${scene.key}-${combatant.permanentId}`}
            aria-hidden="true"
            className={[
              "game-field-clash-ghost",
              attackLunge?.permanentId === combatant.permanentId
                ? `game-permanent-lunge--${attackLunge.direction}`
                : "",
              struck ? "game-permanent-shake" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: center.x - FIELD_CLASH_GHOST_WIDTH / 2,
              top: center.y - FIELD_CLASH_GHOST_HEIGHT / 2,
            }}
          >
            <CardFull cardId={cardId} artId={combatant.artId} width={FIELD_CLASH_GHOST_WIDTH} zoomOnHover={false} />
            {struck ? <ClawSlash /> : null}
          </span>,
        ];
      })}
    </>
  );
}
