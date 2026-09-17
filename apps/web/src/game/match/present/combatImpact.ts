import type { Dispatch, SetStateAction } from "react";
import type { AnimationStep } from "../../animationQueue";
import type { FieldClashScene } from "../../fieldClash";
import { COMBAT_IMPACT_TOTAL_MS, FIELD_CLASH_IMPACT_AT_MS, FIELD_CLASH_LUNGE_AT_MS } from "../../timings";
import type { AttackLunge } from "../types";

/**
 * The blow a battle lands: the full clash for a battle whose defender is known, and the bare
 * impact for a combat deletion with no scene to cut.
 *
 * Both are decoration — they play in `live` mode only — and both take the one impact track,
 * so a newer battle replaces whatever was mid-swing.
 */
export function enqueueCombatImpact({
  clashScenes,
  beaten,
  setFieldClash,
  setAttackLunge,
  setCombatImpactIds,
  enqueue,
}: {
  clashScenes: readonly FieldClashScene[];
  beaten: ReadonlySet<string>;
  setFieldClash: Dispatch<SetStateAction<FieldClashScene | null>>;
  setAttackLunge: Dispatch<SetStateAction<AttackLunge | null>>;
  setCombatImpactIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  enqueue: (step: AnimationStep) => void;
}) {
  for (const scene of clashScenes) {
    const impacted: ReadonlySet<string> = new Set(scene.loserPermanentIds);
    enqueue({
      id: `field-clash-${scene.key}`,
      track: "combatImpact",
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        try {
          setFieldClash(scene);
          await context.wait(FIELD_CLASH_LUNGE_AT_MS);
          if (context.cancelled) return;
          setAttackLunge({ permanentId: scene.attacker.permanentId, direction: scene.direction });
          await context.wait(FIELD_CLASH_IMPACT_AT_MS - FIELD_CLASH_LUNGE_AT_MS);
          if (context.cancelled) return;
          setCombatImpactIds(impacted);
          await context.wait(COMBAT_IMPACT_TOTAL_MS);
        } finally {
          setFieldClash((current) => (current?.key === scene.key ? null : current));
          setAttackLunge((current) => (current?.permanentId === scene.attacker.permanentId ? null : current));
          setCombatImpactIds((current) => (current === impacted ? new Set() : current));
        }
      },
    });
  }
  if (beaten.size === 0) return;
  const impacted: ReadonlySet<string> = new Set(beaten);
  enqueue({
    id: `combat-impact-${[...beaten].join(",")}`,
    track: "combatImpact",
    replace: true,
    async run(context) {
      if (context.mode !== "live") return;
      try {
        setCombatImpactIds(impacted);
        await context.wait(COMBAT_IMPACT_TOTAL_MS);
      } finally {
        setCombatImpactIds((current) => (current === impacted ? new Set() : current));
      }
    },
  });
}
