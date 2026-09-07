import type { Seat } from "@aegis/shared";
import { buildTriggerKey, EffectTiming } from "@aegis/shared";
import type { CollectedEffect } from "../effects/collect.js";
import type { DecisionManager } from "./index.js";
import { log } from "../../logger.js";

export interface ResolverDecisions {
  /**
   * Ask the controller which simultaneously-activatable effect to resolve next;
   * the resolver calls this only when multiple effects need ordering. Resolves to
   * its index into `active`, or null only for the manager's timeout/cancellation
   * fallback.
   */
  chooseOrder(seat: Seat, active: readonly CollectedEffect[], timing?: EffectTiming): Promise<number | null>;
  /** Ask the controller whether to use an optional effect (true = use, false = skip). */
  askOptional(seat: Seat, collected: CollectedEffect): Promise<boolean>;
}

export function createResolverDecisions(manager: DecisionManager): ResolverDecisions {
  return {
    async chooseOrder(seat, active, timing) {
      log(
        "[chooseOrder]",
        `seat=${seat} count=${active.length}`,
        active.map((c) => ({ card: c.source.cardId, desc: c.effect.description, optional: c.effect.optional })),
      );
      // Ordering is only a player decision when at least two effects compete for
      // the next slot. Keep this guard even though the stack resolver already skips
      // lone groups so any direct/legacy caller cannot recreate a confirmation-only
      // round trip.
      if (active.length < 2) return active.length === 1 ? 0 : null;
      // The `orderTriggers` decision carries one key per triggering PERMANENT, not per
      // effect: `effect.effectKey` alone is `cardId/effect-index`, shared by every
      // permanent of the same card, so two copies of the same card triggering
      // simultaneously would collide on a single decision entry (the client rendered
      // duplicate React keys and both order buttons toggled the same entry — see
      // packages/shared/src/protocol/triggerKey.ts). `buildTriggerKey` prefixes with
      // the source's `instanceId` to make each entry independently addressable. The
      // controller answers with exactly one key meaning "resolve this next" and the
      // resolver re-prompts for the remainder one at a time. An empty order can only
      // come from timeout/cancellation; it is honored as a decline only when every
      // remaining effect is optional (source
      // `_CanNoSelect: () => active.All(s => s.CardEffect.IsSkippable(...))`).
      const triggerKeys = active.map((c) => buildTriggerKey(c.source.instanceId, c.effect.effectKey));
      const triggerCardIds = active.map((c) => c.source.cardId);
      // One permanent can put two effects on the stack at once (Megadramon's [On Play]
      // and [When Digivolving]). They share an instanceId and a card, so the chooser can
      // only name them apart by the window each one fired in.
      const decisionTiming = timing !== undefined ? EffectTiming[timing] : undefined;
      const triggerTimings = active.map(
        (c) =>
          c.effect.timingOverride ??
          (c.timing !== undefined ? EffectTiming[c.timing] : undefined) ??
          decisionTiming ??
          "",
      );
      const sharedSourceCardId = triggerCardIds.every((cardId) => cardId === triggerCardIds[0])
        ? triggerCardIds[0]
        : undefined;
      const response = await manager.request({
        seat,
        kind: "orderTriggers",
        promptText: "Choose the next pending effect to resolve.",
        ...(sharedSourceCardId !== undefined ? { sourceCardId: sharedSourceCardId } : {}),
        options: {
          triggerKeys,
          triggerCardIds,
          ...(triggerTimings.some((entry) => entry !== "") ? { triggerTimings } : {}),
          ...(decisionTiming !== undefined ? { timing: decisionTiming } : {}),
        },
      });
      if (response.kind !== "orderTriggers") return null;

      const first = response.order[0];
      if (first === undefined) return null; // declined / empty
      const index = triggerKeys.indexOf(first);
      return index >= 0 ? index : null;
    },

    async askOptional(seat, collected) {
      log(
        "[askOptional]",
        `seat=${seat} card=${collected.source.cardId} desc="${collected.effect.description}" optional=${collected.effect.optional} isSecurity=${collected.effect.isSecurity}`,
      );
      const response = await manager.request({
        seat,
        kind: "optional",
        promptText: "Use this effect?",
        sourceCardId: collected.source.cardId,
        options: {
          effectText: collected.effect.description,
          ...(collected.effect.timingOverride !== undefined
            ? { timing: collected.effect.timingOverride }
            : collected.timing !== undefined
              ? { timing: EffectTiming[collected.timing] }
              : {}),
        },
      });
      return response.kind === "optional" ? response.accept : false;
    },
  };
}
