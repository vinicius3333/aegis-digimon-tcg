import { CardKind } from "@aegis/shared";
import type { EffectContext } from "./EffectContext.js";

/**
 * The card kinds an effect counts as while it resolves. A linked card's clause is an
 * effect of its host Digimon, even when the linked card is an Option (BT25-100/101,
 * KB Q6471/Q6476). Any other effect keeps its printed kinds and also takes the effective
 * kinds of the permanent it sits on, so a Tamer treated as a Digimon activates effects
 * that are both Tamer and Digimon effects (KB Q5980, Q5999, Q6008, Q6104).
 */
export function effectProvenanceKinds(ctx: EffectContext, opts: { isLinked?: boolean } = {}): string[] {
  if (opts.isLinked === true) return [CardKind.Digimon];
  const kinds = new Set<string>(ctx.source?.definition?.kinds ?? []);
  const host = ctx.source?.permanent?.();
  if (host !== undefined) {
    for (const kind of ctx.game?.effectiveKinds?.(host.permanentId) ?? []) kinds.add(kind);
  }
  return [...kinds];
}
