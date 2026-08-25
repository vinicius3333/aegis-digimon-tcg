/* The jolt a permanent takes when an effect locks it down: a short shake the moment
   "this Digimon can't attack" or "can't block" starts applying to it
   (`Effects.cs:1612 FreezePermanentEffect`, 0.2 s, under the heading
   「攻撃・ブロック不可付与エフェクト」 — the grant-a-restriction effect).

   The driver is the synchronized `Permanent.cannotAttack` / `cannotBlock`, diffed
   between two commits. Those are server truth: the engine projects them from the same
   continuous-effect ledger entries its own attack and block legality reads, so nothing
   here re-derives a rule. Only a false -> true transition on a permanent that was
   already on the board raises a pulse — a Digimon that arrives already restricted was
   never frozen, it entered that way. Pure. */

/** Which lock landed. A permanent that takes both at once reports the attack one. */
export type FreezeKind = "cannotAttack" | "cannotBlock";

/** The restriction flags a board read carries for one permanent. */
export interface FreezeFlags {
  cannotAttack: boolean;
  cannotBlock: boolean;
}

export interface FreezePulse {
  permanentId: string;
  kind: FreezeKind;
  /** Re-mounts the pulse so a second lock on the same card restarts its keyframes. */
  key: number;
}

/**
 * Every restriction that started applying between two board reads, keyed by permanent.
 * A permanent absent from the previous read raises nothing: it is entering on a cue of
 * its own, and a restriction it was born with is not a moment.
 */
export function freezePulses({
  previous,
  next,
  nextKey,
}: {
  previous: ReadonlyMap<string, FreezeFlags>;
  next: ReadonlyMap<string, FreezeFlags>;
  /** The first key to hand out; each pulse takes the next one. */
  nextKey: number;
}): FreezePulse[] {
  const pulses: FreezePulse[] = [];
  let key = nextKey;
  for (const [permanentId, flags] of next) {
    const before = previous.get(permanentId);
    if (before === undefined) continue;
    const kind = freezeKind(before, flags);
    if (kind === undefined) continue;
    key += 1;
    pulses.push({ permanentId, kind, key });
  }
  return pulses;
}

/** The lock that just landed, or undefined when nothing became newly restricted. */
export function freezeKind(before: FreezeFlags, after: FreezeFlags): FreezeKind | undefined {
  if (!before.cannotAttack && after.cannotAttack) return "cannotAttack";
  if (!before.cannotBlock && after.cannotBlock) return "cannotBlock";
  return undefined;
}
