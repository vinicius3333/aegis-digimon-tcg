import { describe, it, expect } from "vitest";
import { CardKind, EffectDuration, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { setupEngine } from "../testkit/harness.js";
import {
  ContinuousEffectLedger,
  effectiveColors,
  effectiveKinds,
  effectiveNames,
  effectiveTraits,
} from "./continuous.js";

/** Minimal CardDefinition for the play-prohibition matcher (only kinds/dp/isToken read). */
function def(opts: { kinds: CardKind[]; dp?: number; isToken?: boolean }): CardDefinition {
  return {
    cardId: "X",
    set: "X",
    nameEn: "X",
    kinds: opts.kinds,
    colors: [],
    playCost: 0,
    dp: opts.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    isToken: opts.isToken,
  } as CardDefinition;
}

/** A board holding one seat-0 permanent; `sweep` reads it only to resolve owner seats. */
function boardWithOnePermanent(): { state: ReturnType<typeof setupEngine>["state"]; permanentId: string } {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "p1" }] } });
  return { state: s.state, permanentId: s.perm("p1").permanentId };
}

describe("ContinuousEffectLedger", () => {
  it("stacks distinct named-effect grants and deduplicates one activation identity", () => {
    const ledger = new ContinuousEffectLedger();
    const firstActivation = {};
    const secondActivation = {};

    ledger.addCustomEffectGrant("INSTANCE", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd, {
      activationIdentity: firstActivation,
    });
    ledger.addCustomEffectGrant("INSTANCE", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd, {
      activationIdentity: firstActivation,
    });
    ledger.addCustomEffectGrant("INSTANCE", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd, {
      activationIdentity: secondActivation,
    });
    ledger.addCustomEffectGrant("INSTANCE", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd);
    ledger.addCustomEffectGrant("INSTANCE", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd);

    expect(ledger.listCustomEffectGrants()).toHaveLength(4);
  });

  it("clears continuously re-derived named-effect grants without dropping resolved grants", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addCustomEffectGrant("RESOLVED", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd);
    ledger.addCustomEffectGrant("CONTINUOUS", 0 as Seat, "TOKEN", EffectDuration.UntilOpponentTurnEnd, {
      continuous: true,
    });

    ledger.clearContinuous();

    expect(ledger.listCustomEffectGrants().map((grant) => grant.instanceId)).toEqual(["RESOLVED"]);
  });

  it("suppresses Security effects for every attacker controlled by a seat until turn end", () => {
    const controllers = new Map<string, Seat>([
      ["FIGHTER", 0 as Seat],
      ["ALLY", 0 as Seat],
      ["OPPONENT", 1 as Seat],
    ]);
    const ledger = new ContinuousEffectLedger((permanentId) => controllers.get(permanentId));
    const { state } = boardWithOnePermanent();
    const securityDigimon = def({ kinds: [CardKind.Digimon] });

    ledger.addSecurityEffectDisableForSeat(0 as Seat, "any", EffectDuration.UntilEachTurnEnd);

    expect(ledger.isSecurityEffectDisabled("FIGHTER", securityDigimon)).toBe(true);
    expect(ledger.isSecurityEffectDisabled("ALLY", securityDigimon)).toBe(true);
    expect(ledger.isSecurityEffectDisabled("OPPONENT", securityDigimon)).toBe(false);

    ledger.dropPermanent("FIGHTER");
    expect(ledger.isSecurityEffectDisabled("ALLY", securityDigimon)).toBe(true);
    ledger.sweep(state, "eachTurnEnd", 0 as Seat);
    expect(ledger.isSecurityEffectDisabled("ALLY", securityDigimon)).toBe(false);
  });

  it("replaces original info but preserves effect-granted aliases and colors", () => {
    const ledger = new ContinuousEffectLedger();
    const permanent = { permanentId: "P1" } as Permanent;
    ledger.addOriginalCardInfoOverride(
      "P1",
      { name: "Sukamon", colors: ["White"] },
      EffectDuration.UntilOpponentTurnEnd,
    );
    ledger.addNameTraitGrant("P1", "name", ["Extra Name"], EffectDuration.UntilEachTurnEnd);
    ledger.addColorGrant("P1", "Green", EffectDuration.UntilEachTurnEnd);

    expect(effectiveNames(ledger, permanent, "MetalGreymon")).toEqual(["sukamon", "extra name"]);
    expect(effectiveColors(ledger, "P1", ["Black"])).toEqual(["White", "Green"]);
  });

  it("unions printed and runtime-granted traits case-insensitively", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addNameTraitGrant("P1", "trait", ["Glowing Dawn", "TS"], EffectDuration.UntilEachTurnEnd);

    expect(effectiveTraits(ledger, "P1", ["Beastkin", "glowing dawn"])).toEqual(["Beastkin", "glowing dawn", "ts"]);
  });
  it("records and reports restrictions", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("P1", "attack", EffectDuration.UntilOpponentTurnEnd);
    expect(ledger.hasRestriction("P1", "attack")).toBe(true);
    expect(ledger.hasRestriction("P1", "block")).toBe(false);
    expect(ledger.hasRestriction("P2", "attack")).toBe(false);
  });

  it("re-evaluates player-wide conditional restrictions for existing and future permanents", () => {
    const controllers = new Map<string, Seat>([
      ["EXISTING", 1 as Seat],
      ["LATE", 1 as Seat],
      ["MINE", 0 as Seat],
    ]);
    const sourceCounts = new Map<string, number>([
      ["EXISTING", 0],
      ["LATE", 0],
      ["MINE", 0],
    ]);
    const ledger = new ContinuousEffectLedger((permanentId) => controllers.get(permanentId));
    const { state } = boardWithOnePermanent();
    ledger.addPlayerRestriction(
      1 as Seat,
      0 as Seat,
      "attack",
      EffectDuration.UntilOpponentTurnEnd,
      (permanentId) => sourceCounts.get(permanentId) === 0,
    );

    expect(ledger.hasRestriction("EXISTING", "attack")).toBe(true);
    expect(ledger.hasRestriction("LATE", "attack")).toBe(true);
    expect(ledger.hasRestriction("MINE", "attack")).toBe(false);
    sourceCounts.set("EXISTING", 1);
    expect(ledger.hasRestriction("EXISTING", "attack")).toBe(false);

    ledger.sweep(state, "ownerTurnEnd", 0 as Seat);
    expect(ledger.hasRestriction("LATE", "attack")).toBe(true);
    ledger.sweep(state, "ownerTurnEnd", 1 as Seat);
    expect(ledger.hasRestriction("LATE", "attack")).toBe(false);
  });

  it("keeps overall timing masks live across entrants, controller changes, recomputes and source departure until expiry", () => {
    const controllers = new Map<string, Seat>([
      ["EXISTING", 1 as Seat],
      ["OWN", 0 as Seat],
    ]);
    const matches = new Set(["EXISTING", "LATE_TAMER", "OWN"]);
    const ledger = new ContinuousEffectLedger(undefined, undefined, (id) => controllers.get(id));
    const { state } = boardWithOnePermanent();
    ledger.addPlayerEffectTimingDisable(1 as Seat, 0 as Seat, ["onPlay"], EffectDuration.UntilOpponentTurnEnd, (id) =>
      matches.has(id),
    );
    expect(ledger.isTimingEffectDisabled("EXISTING", "onPlay")).toBe(true);
    expect(ledger.isTimingEffectDisabled("OWN", "onPlay")).toBe(false);
    expect(ledger.isTimingEffectDisabled("EXISTING", "whenAttacking")).toBe(false);
    controllers.set("LATE_TAMER", 1 as Seat);
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(true);
    matches.delete("EXISTING");
    expect(ledger.isTimingEffectDisabled("EXISTING", "onPlay")).toBe(false);
    controllers.set("LATE_TAMER", 0 as Seat);
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(false);
    controllers.set("LATE_TAMER", 1 as Seat);
    ledger.dropPermanent("SOURCE");
    ledger.clearContinuous();
    ledger.sweep(state, "ownerTurnEnd", 0 as Seat);
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(true);
    ledger.sweep(state, "ownerTurnEnd", 1 as Seat);
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(false);
    ledger.addPlayerEffectTimingDisable(
      1 as Seat,
      0 as Seat,
      ["onPlay"],
      EffectDuration.UntilOpponentTurnEnd,
      () => true,
      { continuous: true },
    );
    ledger.clearContinuous();
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(false);
    ledger.addPlayerEffectTimingDisable(
      1 as Seat,
      0 as Seat,
      ["onPlay"],
      EffectDuration.UntilOpponentTurnEnd,
      () => true,
    );
    ledger.reset();
    expect(ledger.isTimingEffectDisabled("LATE_TAMER", "onPlay")).toBe(false);
  });

  it("keeps an unsuspended-digivolve prohibition through recomputes and clears it at the source opponent's turn end", () => {
    const ledger = new ContinuousEffectLedger();
    const { state } = boardWithOnePermanent();
    ledger.addUnsuspendedDigivolveProhibition(1 as Seat, 0 as Seat, EffectDuration.UntilOpponentTurnEnd);

    expect(ledger.isUnsuspendedDigivolveProhibited(1 as Seat)).toBe(true);
    ledger.clearContinuous();
    expect(ledger.isUnsuspendedDigivolveProhibited(1 as Seat)).toBe(true);
    ledger.sweep(state, "ownerTurnEnd", 0 as Seat);
    expect(ledger.isUnsuspendedDigivolveProhibited(1 as Seat)).toBe(true);
    ledger.sweep(state, "ownerTurnEnd", 1 as Seat);
    expect(ledger.isUnsuspendedDigivolveProhibited(1 as Seat)).toBe(false);
  });

  it("keeps target-scoped attack restrictions distinct and drops either departed endpoint", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addAttackTargetRestriction("A1", "D1", EffectDuration.Permanent);
    expect(ledger.cannotAttackTarget("A1", "D1")).toBe(true);
    expect(ledger.cannotAttackTarget("A1", "D2")).toBe(false);
    expect(ledger.hasRestriction("A1", "attack")).toBe(false);

    ledger.dropPermanent("D1");
    expect(ledger.cannotAttackTarget("A1", "D1")).toBe(false);
  });

  it("records name/trait aliases (lowercased)", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addNameTraitGrant("P1", "name", ["Leomon"], EffectDuration.UntilEachTurnEnd);
    ledger.addNameTraitGrant("P1", "trait", ["Hybrid"], EffectDuration.UntilEachTurnEnd);
    expect(ledger.grantedNames("P1")).toEqual(["leomon"]);
    expect(ledger.grantedTraits("P1")).toEqual(["hybrid"]);
  });

  it("records keyword grants and a color waiver", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addKeywordGrant("P1", "Blocker", EffectDuration.UntilEachTurnEnd);
    ledger.addColorWaiver("INST#9", EffectDuration.UntilEachTurnEnd);
    expect(ledger.hasKeyword("P1", "Blocker")).toBe(true);
    expect(ledger.grantedKeywords("P1")).toEqual([{ keyword: "Blocker", amount: undefined }]);
    expect(ledger.hasColorWaiver("INST#9")).toBe(true);
  });

  it("retains an opponent-granted keyword while immunity suppresses it, then reactivates it", () => {
    const { state, permanentId } = boardWithOnePermanent();
    const ledger = new ContinuousEffectLedger((id) => (id === permanentId ? (0 as Seat) : undefined));
    ledger.addKeywordGrant(permanentId, "SecurityAttack", EffectDuration.Permanent, -1, {
      sourceSeat: 1 as Seat,
      sourceKinds: ["Option"],
    });
    expect(ledger.grantedKeywords(permanentId)).toEqual([{ keyword: "SecurityAttack", amount: -1 }]);

    ledger.addRestriction(permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
      fromSourceKind: ["Option"],
      byOpponentEffectsOnly: true,
    });
    expect(ledger.grantedKeywords(permanentId)).toEqual([]);

    ledger.sweep(state, "eachTurnEnd", 0 as Seat);
    expect(ledger.grantedKeywords(permanentId)).toEqual([{ keyword: "SecurityAttack", amount: -1 }]);
  });

  it("preserves the card and clause that granted an inherited keyword", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addKeywordGrant("P1", "Decoy", EffectDuration.Permanent, undefined, {
      sourceCardId: "BT8-060",
      sourceEffectText: "Inherited Decoy (Black)",
      specifiers: ["Black"],
    });

    expect(ledger.keywordGrantSources("P1", "Decoy")).toEqual([
      {
        sourceCardId: "BT8-060",
        effectText: "Inherited Decoy (Black)",
        specifiers: ["Black"],
      },
    ]);
  });

  it("applies a player keyword grant to current and future Digimon until that player's turn ends", () => {
    const controllers = new Map<string, Seat>([
      ["CURRENT", 0 as Seat],
      ["FUTURE", 0 as Seat],
      ["OPPONENT", 1 as Seat],
    ]);
    const ledger = new ContinuousEffectLedger((permanentId) => controllers.get(permanentId));
    const { state } = boardWithOnePermanent();

    ledger.addPlayerKeywordGrant(0 as Seat, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);

    expect(ledger.grantedKeywords("CURRENT")).toEqual([{ keyword: "SecurityAttack", amount: 1 }]);
    expect(ledger.grantedKeywords("FUTURE")).toEqual([{ keyword: "SecurityAttack", amount: 1 }]);
    expect(ledger.grantedKeywords("OPPONENT")).toEqual([]);

    ledger.sweep(state, "ownerTurnEnd", 1 as Seat);
    expect(ledger.hasKeyword("FUTURE", "SecurityAttack")).toBe(true);
    ledger.sweep(state, "ownerTurnEnd", 0 as Seat);
    expect(ledger.hasKeyword("CURRENT", "SecurityAttack")).toBe(false);
  });

  it("sweeps a UntilOwnerTurnEnd restriction at the owner's turn end", () => {
    const ledger = new ContinuousEffectLedger();
    const { state, permanentId } = boardWithOnePermanent();
    ledger.addRestriction(permanentId, "suspend", EffectDuration.UntilOwnerTurnEnd);
    // Opponent's turn end (seat 1) does NOT clear an owner-scoped (seat 0) restriction.
    ledger.sweep(state, "ownerTurnEnd", 1 as Seat);
    expect(ledger.hasRestriction(permanentId, "suspend")).toBe(true);
    // Owner's own turn end (seat 0) clears it.
    ledger.sweep(state, "ownerTurnEnd", 0 as Seat);
    expect(ledger.hasRestriction(permanentId, "suspend")).toBe(false);
  });

  it("clearContinuous drops only continuous rules, keeping one-shot ones", () => {
    const ledger = new ContinuousEffectLedger();
    // One-shot grant (e.g. "gains <Blocker> until end of turn") and a static one.
    ledger.addKeywordGrant("P1", "Rush", EffectDuration.UntilEachTurnEnd);
    ledger.addKeywordGrant("P1", "Blocker", EffectDuration.UntilEachTurnEnd, undefined, {
      continuous: true,
    });
    ledger.addRestriction("P1", "attack", EffectDuration.UntilEachTurnEnd, { continuous: true });
    ledger.addAttackTargetRestriction("P1", "D1", EffectDuration.Permanent, { continuous: true });
    ledger.projectOnDeletionAtEndOfAttack("P1", EffectDuration.UntilEachTurnEnd);
    ledger.clearContinuous();
    expect(ledger.hasKeyword("P1", "Rush")).toBe(true); // one-shot survives
    expect(ledger.hasKeyword("P1", "Blocker")).toBe(false); // continuous cleared
    expect(ledger.hasRestriction("P1", "attack")).toBe(false);
    expect(ledger.cannotAttackTarget("P1", "D1")).toBe(false);
    expect(ledger.listOnDeletionAtEndOfAttackProjections()).toEqual([]);
  });

  // CR-01 A3 (fails-when-reverted): a continuous-tagged canAttackUnsuspended grant (ST12-08's
  // static / [Your Turn] permission) must be dropped by EVERY recompute's clearContinuous and by
  // reset, exactly like its sibling vortexCanAttackPlayersGrants. Reverting either ledger line
  // restores the leak: the grant survives the clear and `canAttackUnsuspended` stays true.
  it("clearContinuous re-derives a continuous canAttackUnsuspended grant (no accumulation/leak)", () => {
    const ledger = new ContinuousEffectLedger();
    // A one-shot grant survives clearContinuous; the continuous one must be re-derived each pass.
    ledger.grantCanAttackUnsuspended("P1", EffectDuration.UntilEachTurnEnd);
    ledger.grantCanAttackUnsuspended("P2", EffectDuration.UntilEachTurnEnd, { continuous: true });
    ledger.clearContinuous();
    expect(ledger.canAttackUnsuspended("P1")).toBe(true); // one-shot survives
    expect(ledger.canAttackUnsuspended("P2")).toBe(false); // continuous cleared, awaiting re-derive

    // Two consecutive recompute passes that re-derive the static grant must not accumulate: the
    // grant is cleared then re-pushed once, so the permission stays exactly "true", never doubling.
    for (let pass = 0; pass < 2; pass += 1) {
      ledger.clearContinuous();
      ledger.grantCanAttackUnsuspended("P2", EffectDuration.UntilEachTurnEnd, { continuous: true });
    }
    expect(ledger.canAttackUnsuspended("P2")).toBe(true);
  });

  it("reset clears a continuous canAttackUnsuspended grant (no cross-match leak)", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.grantCanAttackUnsuspended("P1", EffectDuration.UntilEachTurnEnd, { continuous: true });
    ledger.reset();
    expect(ledger.canAttackUnsuspended("P1")).toBe(false);
  });

  it("drops all rules for a permanent that leaves play", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("P1", "attack", EffectDuration.UntilEachTurnEnd);
    ledger.addKeywordGrant("P1", "Rush", EffectDuration.UntilEachTurnEnd);
    ledger.addNameTraitGrant("P1", "name", ["X"], EffectDuration.UntilEachTurnEnd);
    ledger.dropPermanent("P1");
    expect(ledger.hasRestriction("P1", "attack")).toBe(false);
    expect(ledger.hasKeyword("P1", "Rush")).toBe(false);
    expect(ledger.grantedNames("P1")).toEqual([]);
  });

  // WR-03 (fails-when-reverted): the BT23-024 armed suspend-restriction marker is keyed by its
  // armer permanent and must be torn down by dropPermanent when that armer leaves play, like every
  // other per-permanent store. Reverting the dropPermanent line orphans the marker (stays armed).
  it("dropPermanent removes an armed suspendRestriction source for the departed armer", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.armSuspendRestrictionSource("P1", EffectDuration.UntilOpponentTurnEnd);
    expect(ledger.hasSuspendRestrictionSource("P1")).toBe(true);
    ledger.dropPermanent("P1");
    expect(ledger.hasSuspendRestrictionSource("P1")).toBe(false);
  });

  // Audit follow-up (same class as WR-03): a positive "can only digivolve into [X]" constraint is
  // keyed by the constrained permanent and must lapse via dropPermanent when it leaves play.
  it("dropPermanent removes a digivolveInto constraint for the departed permanent", () => {
    const ledger = new ContinuousEffectLedger();
    const apocalymon = def({ kinds: [CardKind.Digimon] });
    const other = def({ kinds: [CardKind.Digimon], dp: 1 });
    ledger.addDigivolveIntoConstraint("P1", (d) => d.dp === apocalymon.dp, EffectDuration.UntilEachTurnEnd);
    expect(ledger.digivolveIntoAllowed("P1", other)).toBe(false); // constraint active
    ledger.dropPermanent("P1");
    expect(ledger.digivolveIntoAllowed("P1", other)).toBe(true); // constraint gone => base rule
  });

  describe("play/move prohibitions (RestrictPlay)", () => {
    const optionDef = def({ kinds: [CardKind.Option] });
    const digimon5000 = def({ kinds: [CardKind.Digimon], dp: 5000 });
    const digimon7000 = def({ kinds: [CardKind.Digimon], dp: 7000 });
    const tokenOption = def({ kinds: [CardKind.Option], isToken: true });

    it("blocks the restricted seat from playing a matching card (EX1-072: Option)", () => {
      const ledger = new ContinuousEffectLedger();
      // "Your opponent can't use Option cards": from seat-0's view, seat 1 is restricted.
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Option"] },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, optionDef, "play")).toBe(true);
      // A Digimon is not an Option => not blocked.
      expect(ledger.isPlayBlocked(1 as Seat, digimon5000, "play")).toBe(false);
    });

    it("does NOT block the source seat's own play (Q4675 seat scoping)", () => {
      const ledger = new ContinuousEffectLedger();
      // Prohibition on seat 1 only; seat 0 (the source player) is unaffected.
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Option"] },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(0 as Seat, optionDef, "play")).toBe(false);
    });

    it("exempts token plays (Q3834)", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Option"] },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, tokenOption, "play")).toBe(false);
    });

    it("allows a ruling-specific prohibition to include matching Digimon tokens (BT14-017/Q2381)", () => {
      const ledger = new ContinuousEffectLedger();
      const tokenDigimon = def({ kinds: [CardKind.Digimon], dp: 6000, isToken: true });
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Digimon"], dpAtMost: 6000, allowTokens: true },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, tokenDigimon, "play")).toBe(true);
    });

    it("honors the DP cap (EX7-014: Digimon with 6000 DP or less)", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Digimon"], dpAtMost: 6000 },
        "playOrMove",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, digimon5000, "play")).toBe(true);
      expect(ledger.isPlayBlocked(1 as Seat, digimon5000, "move")).toBe(true); // playOrMove covers both
      expect(ledger.isPlayBlocked(1 as Seat, digimon7000, "play")).toBe(false); // over the cap
    });

    it("a play-mode prohibition does not block a move (and vice versa)", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Option"] },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, optionDef, "move")).toBe(false);
    });

    it("lapses at its duration boundary (sweep) and on clearContinuous", () => {
      const { state } = boardWithOnePermanent();
      // Duration-scoped (one-shot) prohibition on seat 1 (UntilOpponentTurnEnd from seat-0 source).
      const ledger = new ContinuousEffectLedger();
      ledger.addPlayProhibition(
        1 as Seat,
        0 as Seat,
        { kinds: ["Option"] },
        "play",
        EffectDuration.UntilOpponentTurnEnd,
      );
      expect(ledger.isPlayBlocked(1 as Seat, optionDef, "play")).toBe(true);
      // Owner (seat 0) turn end does not clear an UntilOpponentTurnEnd entry seated on seat 1...
      // a seat-1 turn end (the restricted/opponent seat's own turn) clears it.
      ledger.sweep(state, "opponentTurnEnd", 1 as Seat);
      expect(ledger.isPlayBlocked(1 as Seat, optionDef, "play")).toBe(false);

      // A CONTINUOUS (static-gated) prohibition is dropped by clearContinuous (BT8-057's gate
      // re-evaluation: the lock is re-derived each pass, so it lapses when the gate fails).
      const ledger2 = new ContinuousEffectLedger();
      ledger2.addPlayProhibition(1 as Seat, 0 as Seat, { kinds: ["Option"] }, "play", EffectDuration.UntilEachTurnEnd, {
        continuous: true,
      });
      expect(ledger2.isPlayBlocked(1 as Seat, optionDef, "play")).toBe(true);
      ledger2.clearContinuous();
      expect(ledger2.isPlayBlocked(1 as Seat, optionDef, "play")).toBe(false);
    });
  });

  describe("KindGrant (HARD-01)", () => {
    it("addKindGrant records a grant and grantedKinds returns the granted CardKind[]", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addKindGrant("P1", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      expect(ledger.grantedKinds("P1")).toEqual([CardKind.Digimon]);
    });

    it("effectiveKinds unions static kinds with grantedKinds (no duplicates)", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addKindGrant("P1", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      const result = effectiveKinds(ledger, "P1", [CardKind.Tamer]);
      expect(result).toContain(CardKind.Tamer);
      expect(result).toContain(CardKind.Digimon);
      expect(result.length).toBe(2);
    });

    it("dropPermanent removes the permanent's KindGrant entries", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addKindGrant("P1", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      ledger.addKindGrant("P2", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      ledger.dropPermanent("P1");
      expect(ledger.grantedKinds("P1")).toEqual([]);
      expect(ledger.grantedKinds("P2")).toEqual([CardKind.Digimon]);
    });

    it("sweep clears KindGrant entries whose duration matches the boundary", () => {
      const ledger = new ContinuousEffectLedger();
      const { state, permanentId } = boardWithOnePermanent();
      ledger.addKindGrant(permanentId, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      // Opponent turn end (seat 1) does NOT clear an UntilEachTurnEnd grant keyed by seat 0
      ledger.sweep(state, "eachTurnEnd", 0 as Seat);
      expect(ledger.grantedKinds(permanentId)).toEqual([]);
    });

    it("clearContinuous drops .continuous entries, keeps one-shot ones", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addKindGrant("P1", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      ledger.addKindGrant("P2", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd, {
        continuous: true,
      });
      ledger.clearContinuous();
      expect(ledger.grantedKinds("P1")).toEqual([CardKind.Digimon]); // one-shot survives
      expect(ledger.grantedKinds("P2")).toEqual([]); // continuous cleared
    });

    it("reset clears all KindGrant entries", () => {
      const ledger = new ContinuousEffectLedger();
      ledger.addKindGrant("P1", [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      ledger.reset();
      expect(ledger.grantedKinds("P1")).toEqual([]);
    });
  });
});
