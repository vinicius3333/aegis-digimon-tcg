import type { Action } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { runAction } from "../dispatch.js";
import { canAttemptDigivolve } from "./digivolve.js";
import { inspectOwnSecurity, runRevealAction } from "./reveal.js";

type SecuritySearch = Extract<Action, { kind: "Search" }>;
type SecurityDigivolve = Extract<Action, { kind: "Digivolve" }>;

/** A cost-free self evolution can ask the private search and its optional pick together. */
export function isSecuritySearchDigivolvePair(search: Action, next: Action | undefined): boolean {
  return (
    search.kind === "Search" &&
    search.to === "revealed" &&
    search.count === "all" &&
    (search.searchZone ?? search.filter.zone) === "security" &&
    search.controller !== "opponent" &&
    search.condition === undefined &&
    search.cost === undefined &&
    search.optional !== true &&
    search.then === undefined &&
    next?.kind === "Digivolve" &&
    next.optional === true &&
    next.payCost === false &&
    next.cost === undefined &&
    next.condition === undefined &&
    next.amongPreviousSearch === true &&
    next.faceDownSecurityOk === true &&
    next.from?.length === 1 &&
    next.from[0] === "security" &&
    next.target?.isSelf === true &&
    next.target.count === 1 &&
    next.into !== undefined &&
    "filter" in next.into
  );
}

export async function runSecuritySearchDigivolve(
  ctx: EffectContext,
  search: SecuritySearch,
  digivolve: SecurityDigivolve,
): Promise<boolean> {
  await runRevealAction(ctx, search, { deferSecurityInspection: true });
  // A predeclared refusal or an empty legal pool still has to show the searched
  // security privately. The normal optional resolver then skips the evolution.
  if (
    ctx.presetOptionalAnswer === false ||
    ctx.predecidedOptionalActions?.get(digivolve) === false ||
    !canAttemptDigivolve(ctx, digivolve)
  ) {
    await inspectOwnSecurity(ctx);
    return runAction(ctx, digivolve);
  }
  // Selecting no card is the refusal. Keep the normal legality and evolution
  // primitive, and let its visible-card metadata show the entire private search.
  ctx.lastEffectActed = false;
  return runAction(ctx, {
    ...digivolve,
    optional: false,
    into: { ...digivolve.into, upTo: true },
  });
}
