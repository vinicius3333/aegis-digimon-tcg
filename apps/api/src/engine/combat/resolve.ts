/**
 * Pure combat resolution: compare DP (or, under ＜Iceclad＞, digivolution-card
 * count) and decide who is deleted.
 *
 * Source: IBattle.CompareStats / IBattle.Battle in
 * presentation concerns; this is a pure function over two DP values and is
 * the unit-testable core of the attack-and-block subsystem.
 *
 * source rule (documented behavior 4642-4706):
 *   statCheck = clamp(attackerDP - defenderDP, -1, 1)
 *     +1 => attacker wins, defender deleted
 *      0 => tie, BOTH deleted
 *     -1 => defender wins, attacker deleted
 * i.e. the loser is deleted, and a tie (equal DP) deletes both. This matches the
 * subsystem spec in historical migration ledger: "loser with DP <= winner is
 * deleted, ties delete both".
 *
 * Two source branches this function also implements (Comprehensive Rules-grounded,
 * see combat/resolve.test.ts for the citations):
 *   - ＜Iceclad＞ (§16-35-1/§16-35-4): when EITHER battling Digimon has this keyword,
 *     the battle compares digivolution-card counts instead of DP — same
 *     winner/loser/tie semantics, just a different metric. The rule's "other than
 *     battles against Security Digimon" carve-out is automatic here: this function
 *     only resolves permanent-vs-permanent battles; resolveSecurityBattle (below)
 *     stays DP-only.
 *   - A "can't be deleted in battle" grant (the `beDeletedInBattle` continuous
 *     restriction real cards print, e.g. BT16-018/BT19-023/BT3-099 "1 of your
 *     Digimon can't be deleted in battle until…") spares that side from
 *     `deletedPermanentIds` even when it lost or tied the comparison. It does not
 *     change who won — `comparison`/`wasTie` still reflect the raw battle result.
 */

export type CombatComparison = "attackerWins" | "defenderWins" | "tie";

/** clamp(a-b, -1, 1) — the source CompareStats result, by name. */
export function compareDP(attackerDP: number, defenderDP: number): CombatComparison {
  const diff = attackerDP - defenderDP;
  if (diff > 0) {
    return "attackerWins";
  }
  if (diff < 0) {
    return "defenderWins";
  }
  return "tie";
}

export interface Combatants {
  attackerPermanentId: string;
  attackerDP: number;
  defenderPermanentId: string;
  defenderDP: number;
  /**
   * ＜Iceclad＞ (§16-35-1): true when the attacker/defender carries the keyword.
   * When either is true, the battle compares digivolution-card counts instead of
   * DP (§16-35-4). Omit (or leave both false) for the default DP path — the
   * every-other-call-site behavior is unchanged.
   */
  attackerHasIceclad?: boolean;
  defenderHasIceclad?: boolean;
  /** Digivolution-card counts (`permanent.stack.length`), read only when Iceclad applies. */
  attackerDigivolutionCount?: number;
  defenderDigivolutionCount?: number;
  /**
   * A "can't be deleted in battle" grant (the `beDeletedInBattle` continuous
   * restriction) spares this side from `deletedPermanentIds` — it lost or tied the
   * comparison, but is not actually deleted. Omit (or leave both false) for the
   * default "every battling Digimon can be deleted" path.
   */
  attackerSparedFromDeletion?: boolean;
  defenderSparedFromDeletion?: boolean;
}

export interface CombatOutcome {
  comparison: CombatComparison;
  /** Permanent ids that lose the battle and must be deleted (loser, or both on a tie). */
  deletedPermanentIds: string[];
  /** Convenience: was it a tie (both deleted)? */
  wasTie: boolean;
}

/**
 * Resolve a Digimon-vs-Digimon battle into the set of permanents to delete.
 * Pure: it does not mutate state, it only decides the outcome. The caller
 * (CombatController) performs the actual deletion and fires deletion timings.
 */
export function resolvePermanentBattle(combatants: Combatants): CombatOutcome {
  const useIceclad = combatants.attackerHasIceclad === true || combatants.defenderHasIceclad === true;
  const comparison = useIceclad
    ? compareDP(combatants.attackerDigivolutionCount ?? 0, combatants.defenderDigivolutionCount ?? 0)
    : compareDP(combatants.attackerDP, combatants.defenderDP);

  const rawLoserIds: string[] =
    comparison === "attackerWins"
      ? [combatants.defenderPermanentId]
      : comparison === "defenderWins"
        ? [combatants.attackerPermanentId]
        : [combatants.attackerPermanentId, combatants.defenderPermanentId];

  const spared = new Set<string>();
  if (combatants.attackerSparedFromDeletion === true) spared.add(combatants.attackerPermanentId);
  if (combatants.defenderSparedFromDeletion === true) spared.add(combatants.defenderPermanentId);

  return {
    comparison,
    deletedPermanentIds: rawLoserIds.filter((id) => !spared.has(id)),
    wasTie: comparison === "tie",
  };
}

export interface SecurityBattle {
  attackerPermanentId: string;
  attackerDP: number;
  securityCardDP: number;
}

export interface SecurityBattleOutcome {
  /** The revealed security Digimon is destroyed (it is trashed regardless; this flags a battle loss). */
  securityDigimonDeleted: boolean;
  /** The attacker is deleted when it loses or ties the security Digimon's DP. */
  attackerDeleted: boolean;
}

/**
 * Resolve the attacker vs. a revealed security Digimon (IBattle "battle with
 * card", documented behavior). source: attacker DP strictly greater =>
 * security Digimon dies; equal => tie, attacker also dies; less => attacker dies.
 * The security card itself is trashed by the security-check flow either way; this
 * only decides whether the ATTACKER survives and flags the battle result.
 *
 * Pure helper used by the minimal security hand-off in CombatController; full
 * security resolution remains the security-and-win-check subsystem.
 */
export function resolveSecurityBattle(battle: SecurityBattle): SecurityBattleOutcome {
  if (battle.attackerDP > battle.securityCardDP) {
    return { securityDigimonDeleted: true, attackerDeleted: false };
  }
  if (battle.attackerDP === battle.securityCardDP) {
    return { securityDigimonDeleted: true, attackerDeleted: true };
  }
  return { securityDigimonDeleted: false, attackerDeleted: true };
}
