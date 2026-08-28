// Acting on other effects, plus the unparsed escape hatch.

import type { EffectContext } from "../../EffectContext.js";
import { runtimeCompiledCard } from "../compiledCards.js";
import { runEffect } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { scaleFactor } from "../scaling.js";
import { resolvePermanentTargets } from "../targeting/permanents.js";
import { runActivateEffect, runActivateForeignEffect, runActivateMain, runUseOptionWithoutCost } from "./borrowed.js";
import { EffectTiming } from "@aegis/shared";
import type { Action } from "@aegis/shared";

export async function runMetaAction(ctx: EffectContext, action: Action): Promise<boolean> {
  switch (action.kind) {
    case "ActivateMain": {
      // Some IR records carry declarative metadata for custom turn-end rules under the
      // legacy ActivateMain shape so older audit tooling can see a non-empty action.
      // This is not the security "activate this card's [Main] effect" operation, so it
      // must not call runActivateMain or emit a loud missing-[Main] gap.
      if ((action as any).turnEndCondition !== undefined) return false;
      await runActivateMain(ctx);
      return false;
    }
    case "ActivateOptionMain": {
      const count = Math.max(1, action.count ?? 1);
      for (let i = 0; i < count; i++) await runActivateMain(ctx);
      return false;
    }
    case "WinGame": {
      const winner = action.winner === "controller" ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
      ctx.fx.declareWinner(winner);
      return false;
    }
    case "ReactivateEffect": {
      if (action.target !== undefined) {
        const timing = action.fromTrigger === "WhenDigivolving" ? EffectTiming.WhenDigivolving : undefined;
        if (timing === undefined) {
          unsupported(ctx, action, `targeted reactivation does not support ${action.fromTrigger}`);
          return false;
        }
        const targetIds = await resolvePermanentTargets(ctx, action.target);
        ctx.lastEffectActed = false;
        for (const permanentId of targetIds) {
          ctx.lastEffectActed = (await ctx.fx.reactivateOnPlay?.(permanentId, { timings: [timing], chooseOne: false })) === true || ctx.lastEffectActed;
        }
        return false;
      }
      if (action.targetSource === "triggerSubject") {
        const permanentId = ctx.trigger.subjectPermanentId;
        if (permanentId === undefined) {
          ctx.lastEffectActed = false;
          return false;
        }
        const timing = action.fromTrigger === "Main" ? EffectTiming.OnDeclaration : undefined;
        if (timing === undefined) {
          unsupported(ctx, action, `trigger-subject reactivation does not support ${action.fromTrigger}`);
          ctx.lastEffectActed = false;
          return false;
        }
        ctx.lastEffectActed = (await ctx.fx.reactivateOnPlay?.(permanentId, { timings: [timing] })) === true;
        return false;
      }
      const compiled = runtimeCompiledCard(ctx.source.cardId);
      if (!compiled) return false;
      const factor = action.scaling ? scaleFactor(ctx, action.scaling) : 1;
      const reps = action.count * factor;
      const toRun = compiled.effects.filter((e) => e.trigger === action.fromTrigger).slice(0, action.count);
      for (let i = 0; i < reps; i++) {
        for (const eff of toRun) await runEffect(ctx, eff);
      }
      return false;
    }
    case "ActivateForeignEffect":
      await runActivateForeignEffect(ctx, action);
      return false;
    case "ActivateEffect":
      await runActivateEffect(ctx, action);
      return false;
    case "UseOptionWithoutCost":
      await runUseOptionWithoutCost(ctx, action);
      return false;
    case "RawUnparsed":
      unsupported(ctx, action, `unparsed clause: "${action.text}"`);
      return false;
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
