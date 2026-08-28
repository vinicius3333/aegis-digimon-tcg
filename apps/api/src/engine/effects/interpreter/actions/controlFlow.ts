// Branching, delay, and arming event-driven sub-effects.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { payCost } from "../costs.js";
import { runAction } from "../dispatch.js";
import { runModal } from "./modal.js";
import { runPrevent, runReplacement } from "./replacement.js";
import { runGainTriggeredEffect, runSubTrigger } from "./subTrigger.js";
import type { Action } from "@aegis/shared";

export async function runControlFlowAction(ctx: EffectContext, action: Action): Promise<boolean> {
  switch (action.kind) {
    case "Modal": {
      await runModal(ctx, action);
      return false;
    }
    case "ConditionalBranch": {
      const branch = evaluateCondition(ctx, action.condition) ? action.ifTrue : (action.ifFalse ?? []);
      for (const nested of branch) {
        const abort = await runAction(ctx, nested);
        if (abort) break;
      }
      return false;
    }
    case "DelayedEffect": {
      const self = ctx.source.permanent();
      if (self === undefined) return false;
      // The delayed body runs in a FRESH context a turn later, so the effect-result bindings it
      // names ("return THAT Digimon to the hand" — BT17-069, LM-013) have to be carried across
      // explicitly. Snapshot them at arm time: nothing else survives the gap, and without this
      // a `boundRef` target resolves to nothing and the delayed clause silently does nothing.
      const armedBindings = {
        boundPlayed: ctx.boundPlayed === undefined ? undefined : new Map(ctx.boundPlayed),
        selections: ctx.selections === undefined ? undefined : new Map(ctx.selections),
        namedCounts: ctx.namedCounts === undefined ? undefined : new Map(ctx.namedCounts),
      };
      ctx.fx.subscribeSubTrigger({
        event: "endOfTurn",
        sourcePermanentId: self.permanentId,
        once: true,
        expiresOnTurnEndOf: ctx.game.opponentOf(ctx.source.ownerSeat),
        matches: (subCtx) => !subCtx.source.isOwnersTurn(),
        description: action.raw ?? "DelayedEffect(nextEndOfOpponentTurn)",
        run: async (subCtx) => {
          const writable = subCtx as unknown as {
            boundPlayed?: Map<string, Set<string>>;
            selections?: Map<string, string>;
            namedCounts?: Map<string, number>;
          };
          if (armedBindings.boundPlayed !== undefined) {
            writable.boundPlayed = new Map([...(writable.boundPlayed ?? []), ...armedBindings.boundPlayed]);
          }
          if (armedBindings.selections !== undefined) {
            writable.selections = new Map([...(writable.selections ?? []), ...armedBindings.selections]);
          }
          if (armedBindings.namedCounts !== undefined) {
            writable.namedCounts = new Map([...(writable.namedCounts ?? []), ...armedBindings.namedCounts]);
          }
          await runAction(subCtx, action.effect);
        },
      });
      return false;
    }
    case "SubTrigger": {
      await runSubTrigger(ctx, action);
      return false;
    }
    case "Replacement": {
      await runReplacement(ctx, action);
      return false;
    }
    case "Prevent": {
      await runPrevent(ctx, action);
      return false;
    }
    case "GainTriggeredEffect": {
      await runGainTriggeredEffect(ctx, action);
      return false;
    }
    case "GainEffect": {
      await runGainTriggeredEffect(ctx, {
        ...action,
        kind: "GainTriggeredEffect",
        gainedTrigger: action.grant.trigger,
        gainedActions: action.grant.actions,
      });
      return false;
    }
    case "CostGatedBlock": {
      // This wrapper owns the single payment; nested actions deliberately run without re-paying
      // the wrapper cost (EX6-021, Q3719).
      const paid = await payCost(ctx, action.cost);
      if (!paid) return action.abortOnDecline === true;
      for (const nested of action.actions) {
        const abort = await runAction(ctx, nested);
        if (abort) break;
      }
      return false;
    }
    case "RestrictEffect": {
      if (action.scope === "thisEffect") {
        ctx.effectRestrictions ??= new Set();
        ctx.effectRestrictions.add(action.restriction);
      }
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
