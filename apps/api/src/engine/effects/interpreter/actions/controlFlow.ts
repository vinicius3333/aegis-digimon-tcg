// Branching, delay, and arming event-driven sub-effects.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { runAction } from "../dispatch.js";
import { runModal } from "./modal.js";
import { runPrevent, runReplacement } from "./replacement.js";
import { runGainTriggeredEffect, runSubTrigger } from "./subTrigger.js";
import type { Action } from "@aegis/shared";

export async function runControlFlowAction(
  ctx: EffectContext,
  action: Action,
): Promise<boolean> {
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
      ctx.fx.subscribeSubTrigger({
        event: "endOfTurn",
        sourcePermanentId: self.permanentId,
        once: true,
        expiresOnTurnEndOf: ctx.game.opponentOf(ctx.source.ownerSeat),
        matches: (subCtx) => !subCtx.source.isOwnersTurn(),
        description: action.raw ?? "DelayedEffect(nextEndOfOpponentTurn)",
        run: async (subCtx) => {
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
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
