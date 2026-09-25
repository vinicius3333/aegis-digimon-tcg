import type { Action } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { candidatePermanents } from "./permanents.js";

type SecurityManipulation = Extract<Action, { kind: "SecurityManipulation" }>;

export function isDetachTopAction(action: Action): action is SecurityManipulation {
  return action.kind === "SecurityManipulation" && action.detachPermanentTop === true;
}

/**
 * "The top card of a Digimon" needs cards under it (BT9-044 Q1840, BT17-098 Q2892, EX13-032
 * Q7307). A detach-top action with no source that has digivolution cards cannot be activated,
 * so its optional prompt must not be raised.
 */
export function canDetachPermanentTop(ctx: EffectContext, action: SecurityManipulation): boolean {
  const source = action.source;
  if (typeof source !== "object") return true;
  if (source.isSelf === true || source.filter.isSelfRef === true) {
    return (ctx.source.permanent()?.stack.length ?? 0) > 0;
  }
  return candidatePermanents(ctx, source).some((permanent) => permanent.stack.length > 0);
}

/** True when `actions` is non-empty and made only of detach-top actions that cannot run. */
export function onlyInfeasibleDetachTop(ctx: EffectContext, actions: readonly Action[]): boolean {
  return (
    actions.length > 0 && actions.every((action) => isDetachTopAction(action) && !canDetachPermanentTop(ctx, action))
  );
}
