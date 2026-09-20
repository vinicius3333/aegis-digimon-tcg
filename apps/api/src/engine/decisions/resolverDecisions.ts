import type { DecisionResponse, Seat } from "@aegis/shared";
import { buildTriggerKey, EffectTiming } from "@aegis/shared";
import type { CollectedEffect } from "../effects/collect.js";
import type { DecisionExecutionFrame, DecisionJsonValue, DecisionManager } from "./index.js";
import {
  DECISION_API_CONTINUATION,
  decisionApiExecutionContinuation,
  normalizeOptional,
  resumeDecisionApiFrame,
} from "./decisionApi.js";
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

export const RESOLVER_CHOOSE_ORDER_CONTINUATION = "resolver.choose-order";
const RESOLVER_CHOOSE_ORDER_CONTINUATION_VERSION = 1;

interface ChooseOrderContinuationResult {
  readonly [key: string]: DecisionJsonValue;
  readonly selectedTriggerKey: string | null;
  readonly selectedIndex: number | null;
}

/** Resolve the stable portion of chooseOrder after an answer, including on a restored process. */
export function resumeChooseOrderFrame(
  frame: DecisionExecutionFrame,
  response: DecisionResponse,
): ChooseOrderContinuationResult {
  const triggerKeys = frame.continuation.data.triggerKeys;
  const requestTriggerKeys = frame.request.options?.triggerKeys;
  const validationTriggerKeys = frame.validation.triggerKeys;
  if (
    frame.request.kind !== "orderTriggers" ||
    !Array.isArray(triggerKeys) ||
    triggerKeys.length < 2 ||
    !triggerKeys.every((key) => typeof key === "string") ||
    new Set(triggerKeys).size !== triggerKeys.length ||
    !sameStrings(requestTriggerKeys, triggerKeys) ||
    !sameStrings(validationTriggerKeys, triggerKeys)
  ) {
    throw new Error("invalid choose-order execution frame");
  }
  return chooseOrderContinuation(triggerKeys, response);
}

function sameStrings(actual: readonly string[] | undefined | null, expected: readonly string[]): boolean {
  return (
    actual !== undefined &&
    actual !== null &&
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function chooseOrderContinuation(
  triggerKeys: readonly string[],
  response: DecisionResponse,
): ChooseOrderContinuationResult {
  if (response.kind !== "orderTriggers") return { selectedTriggerKey: null, selectedIndex: null };
  const selectedTriggerKey = response.order[0] ?? null;
  const index = selectedTriggerKey === null ? -1 : triggerKeys.indexOf(selectedTriggerKey);
  return {
    selectedTriggerKey: index >= 0 ? selectedTriggerKey : null,
    selectedIndex: index >= 0 ? index : null,
  };
}

export function createResolverDecisions(
  manager: DecisionManager,
  beforeRequest: () => Promise<void> = async () => {},
): ResolverDecisions {
  manager.registerExecutionFrameResumer(DECISION_API_CONTINUATION, 1, resumeDecisionApiFrame);
  manager.registerExecutionFrameResumer(
    RESOLVER_CHOOSE_ORDER_CONTINUATION,
    RESOLVER_CHOOSE_ORDER_CONTINUATION_VERSION,
    resumeChooseOrderFrame,
  );
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
      // A preceding effect may have changed the board and installed a duration-scoped
      // keyword before engine asks which newly-triggered effect resolves next. Publish
      // those derived fields first: the decision itself causes the room to flush state,
      // and clients must not see a legal attacker as summoning-sick during the pause.
      await beforeRequest();
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
      // One watcher can be armed by multiple discard events before this prompt.
      // Preserve every activation while keeping React keys and responses unambiguous.
      const usedKeys = new Set<string>();
      const triggerKeys = active.map((c) => {
        const base = buildTriggerKey(c.source.instanceId, c.effect.effectKey);
        let key = base;
        let occurrence = 1;
        while (usedKeys.has(key)) key = `${base}/activation-${++occurrence}`;
        usedKeys.add(key);
        return key;
      });
      const triggerCardIds = active.map((c) => c.source.cardId);
      // One permanent can put two effects on the stack at once (Megadramon's [On Play]
      // and [When Digivolving]). They share an instanceId and a card, so the chooser can
      // only name them apart by the window each one fired in.
      const decisionTiming = timing !== undefined ? EffectTiming[timing] : undefined;
      const triggerTimings = active.map(
        (c) =>
          c.effect.timingOverride ??
          c.printedTiming ??
          c.effect.irTrigger ??
          c.timingLabel ??
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
          triggerDescriptions: active.map((c) => c.effect.description ?? ""),
          triggerIsInherited: active.map((c) => c.effect.isInherited),
          ...(triggerTimings.some((entry) => entry !== "") ? { triggerTimings } : {}),
          ...(decisionTiming !== undefined ? { timing: decisionTiming } : {}),
        },
        executionContinuation: {
          kind: RESOLVER_CHOOSE_ORDER_CONTINUATION,
          version: RESOLVER_CHOOSE_ORDER_CONTINUATION_VERSION,
          data: { triggerKeys },
        },
      });
      return chooseOrderContinuation(triggerKeys, response).selectedIndex;
    },

    async askOptional(seat, collected) {
      log(
        "[askOptional]",
        `seat=${seat} card=${collected.source.cardId} desc="${collected.effect.description}" optional=${collected.effect.optional} isSecurity=${collected.effect.isSecurity}`,
      );
      await beforeRequest();
      const response = await manager.request({
        seat,
        kind: "optional",
        promptText: "Use this effect?",
        sourceCardId: collected.source.cardId,
        sourceInstanceId: collected.source.instanceId,
        sourcePermanentId: collected.conferredToPermanentId ?? collected.source.permanent()?.permanentId,
        options: {
          effectText: collected.effect.description,
          ...(collected.effect.timingOverride !== undefined
            ? { timing: collected.effect.timingOverride }
            : collected.timing !== undefined
              ? { timing: EffectTiming[collected.timing] }
              : {}),
        },
        executionContinuation: decisionApiExecutionContinuation("optional"),
      });
      return normalizeOptional(response);
    },
  };
}
