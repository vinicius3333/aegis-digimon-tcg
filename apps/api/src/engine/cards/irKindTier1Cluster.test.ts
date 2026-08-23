import { describe, it, expect } from "vitest";
import { PlayerState, CardInstance, EffectTiming, type Seat, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import type { EffectContext } from "../effects/EffectContext.js";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "../testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module so the engine resolves
// each vehicle's effects through the real interpreter by card id.
import "../../cards/index.js";

/**
 * Phase 5 Plan 01 (IR-02 Tier-1) — A3 cluster proving the 13 "prove-now" wired-unproven
 * IR kinds. Each kind drives a PRODUCTION intent through the real GameEngine (`applyIntent`)
 * — or, for the few kinds whose only faithful trigger is not a player verb, drives the
 * vehicle's compiled effect through the REAL interpreter module resolve path — against an
 * IR-FAITHFUL catalog vehicle (the compiled IR confirmed to match its documented behavior oracle + KB), and
 * asserts the SPECIFIC numeric/state delta. Every kind records a REVERT-CONFIRM-RED lever:
 * the exact handler/read to stub to a no-op that turns the assertion RED (verified during
 * authoring). "No error thrown" is rejected per the binding honesty contract.
 *
 * The 13 kinds + their faithful vehicles (avoiding every 05-RESEARCH-named mismodel —
 * BT21-030 Trash / BT22-041 SecurityManipulation hand-form / BT20-083 Digivolve / BT23-056
 * Attack):
 *   SetMemory             — BT1-086 [Start of Your Turn] set memory to 3 if <=2 (turn window)
 *   Trash                 — BT13-080 [On Play] Draw 1, then trash 1 from hand
 *   SecurityManipulation  — BT16-024 [On Play] place an Angel hand card at the bottom of security
 *   GrantStatic           — BT8-061 [Rule] name also treated as [Mamemon]
 *   AddToHandSelf         — BT1-093 [Security] add this Option to the hand
 *   ActivateMain          — BT1-094 [Security] activate this card's own [Main] Delete
 *   SelectBind            — BT12-108 [Main] bind a Digimon, delete opp Digimon <= its DP
 *   Replacement           — BT18-082 [All Turns] prevent this Digimon's own removal
 *   Digivolve             — BT16-093 [Main] digivolve a [Gargomon] base into [Rapidmon]
 *   Link                  — BT22-039 links an [Appmon] <Link> card (re-proves the kind here)
 *   MindLink              — BT15-086 [Main] Mind-Link pairing relocates the Digimon
 *   RestrictCostReduction — BT5-021 opponent can't reduce digivolve cost
 *   RestrictMemoryGain    — BT3-046 opponent can't gain memory by effect
 */

async function recompute(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

// Read-access to the engine's continuous-effect ledger (private field). Granted name/trait,
// memory-gain policy, and cost-reduction blocks live only in the ledger; a behavioral A3
// reads them at that boundary.
interface ContinuousReader {
  grantedNames(permanentId: string): string[];
  blocksCostReduction(seat: Seat, costType: "play" | "digivolve"): boolean;
  canGainMemoryFromEffect(seat: Seat, effectSource: { definition: { kinds: unknown[] } } | undefined): boolean;
}

function continuousLedger(s: EngineSetup): ContinuousReader {
  return (s.engine as unknown as { continuous: ContinuousReader }).continuous;
}

// ---------------------------------------------------------------------------
// 1) SetMemory — BT1-086 [Start of Your Turn] set memory to 3 when <= 2
//    Driven through the REAL turn loop (runOneTurn) so the OnStartTurn install
//    window actually opens; SetMemory fires gated by memoryAtMost(2).
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — SetMemory (BT1-086 [Start of Your Turn] set memory to 3 if <=2)", () => {
  it("raises memory 1 -> 3 at the OnStartTurn window (KB BT1-086 Q948)", async () => {
    // Stage decks so the real turn loop can draw.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", dp: 4000, as: "carrier" }],
        // A playable hand card so the Main phase has a legal action — the engine auto-ends the
        // Main phase at entry when the turn player has nothing to do, which would run the turn
        // to completion (and the pass-turn memory rule) before the window is observed.
        hand: [{ card: "AD1-001", faceUp: true }],
        deck: Array(5).fill("AD1-001"),
      },
      1: { deck: Array(5).fill("AD1-001") },
    });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 1; // below the memoryAtMost(2) gate

    // Drive ONE real turn: runOneTurn opens OnStartTurn, then blocks in Main until endPhase.
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
    // BT1-086's SetMemory fired at OnStartTurn: memory raised to its fixed value 3.
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "SetMemory", replace `ctx.fx.setMemory(action.value)`
  // with `return false;` (no-op). The OnStartTurn window then leaves memory at 1 -> `toBe(3)` goes RED.
  // (Verified during authoring: stubbing setMemory leaves memory === 1.)
});

// ---------------------------------------------------------------------------
// 2) Trash — BT13-080 [On Play] Draw 1, then trash 1 card in your hand
//    documented behavior/308 ("<Draw 1>. Then, trash 1 card in your hand",
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — Trash (BT13-080 [On Play] discard 1 from hand)", () => {
  it("the chosen hand card leaves the hand and enters the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-080", as: "source" },
            { card: "BT1-009", as: "victim" },
          ], // BT13-080: Purple Digimon, cost 3; victim: the lone OTHER hand card
          // A drawable card so the [On Play] Draw 1 has a source.
          deck: ["AD1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const source = s.inst("source");
    const victim = s.inst("victim");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({ ok: true });
    await settle(() => p0.trash.some((c) => c.instanceId === victim.instanceId));

    // The discard leg trashed the chosen hand card.
    expect(p0.trash.some((c) => c.instanceId === victim.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === victim.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "Trash", short-circuit the hand-zone branch
  // (`if (action.target.filter.zone === "hand") return false;`). The discard never runs ->
  // the victim stays in hand and never reaches trash -> both assertions go RED.
});

// ---------------------------------------------------------------------------
// 3) SecurityManipulation — BT16-024 [On Play] hand-source placeAsSecurity, gated on
//    "Security Bottom Card") + KB Q3747: "If this effect digivolved, you may place 1
//    Digimon card with the [Angel], [Archangel] or [Three Great Angels] trait FROM THE
//    HAND at the BOTTOM of your security stack." The digivolve happens first (this
//    Digimon digivolves into an Angel for cost -2), then the hand card enters the
//    bottom of the controller's security stack.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — SecurityManipulation (BT16-024 [On Play] place a Digimon as security)", () => {
  it("searches the full security stack and digivolves from the matching revealed card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "source" }],
          deck: [{ card: "BT1-063", as: "deckDecoy" }],
          security: [{ card: "BT1-063", as: "securityEvo" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const source = s.inst("source");
    const securityEvo = s.inst("securityEvo");
    const deckDecoy = s.inst("deckDecoy");
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.instanceId === securityEvo.instanceId), 400);

    expect(p0.battleArea.some((p) => p.topCard?.instanceId === securityEvo.instanceId)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === securityEvo.instanceId)).toBe(false);
    // The security card is the physical digivolution source. The standard digivolution
    // bonus draw moves the Angel deck decoy into hand, then the effect's optional follow-up
    // places that drawn Angel at the bottom of security under auto-selection.
    expect(p0.hand.some((c) => c.instanceId === deckDecoy.instanceId)).toBe(false);
    expect(p0.security.some((c) => c.instanceId === deckDecoy.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("after the effect digivolves, places an Angel-trait hand card at the bottom of security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-024", as: "source" }, // MagnaAngemon, Blue/Yellow lvl 5, cost 6
            { card: "BT16-035", as: "placedCard" }, // SlashAngemon (Angel) — the security placement
          ],
          // Printed text: "search your security stack. This Digimon may digivolve into a Digimon card
          // with the [Angel]/[Three Great Angels] trait AMONG THEM" — the digivolve source is the
          // SEARCHED SECURITY STACK, never the hand (KB Q3747 confirms the digivolve-then-hand-place
          // sequence). `intoCard` therefore belongs in security, alongside a second card so the
          // digivolve pick is observable against a non-trivial stack.
          security: [
            { card: "BT1-063", as: "intoCard" }, // Seraphimon (Three Great Angels), evoCost Y lvl5: 3
            "BT1-009",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const source = s.inst("source");
    const placedCard = s.inst("placedCard");
    const intoCard = s.inst("intoCard");

    s.state.memory = 10;
    const securityBefore = p0.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({ ok: true });
    await settle(() => p0.security.some((c) => c.instanceId === placedCard.instanceId), 400);

    // The effect digivolved BT16-024 into the Angel FROM SECURITY (the searched stack)...
    const evolved = p0.battleArea.find((p) => p.topCard?.instanceId === intoCard.instanceId);
    expect(evolved, "BT16-024 digivolved into the security Angel").toBeDefined();
    expect(p0.security.some((c) => c.instanceId === intoCard.instanceId)).toBe(false); // left security as digivolve material
    // ...then placed the Angel-trait HAND card at the BOTTOM of security. Net count is UNCHANGED
    // (one card left security as digivolve material, one was placed back) — not a net +1.
    expect(p0.security.length).toBe(securityBefore);
    expect(p0.security[p0.security.length - 1]?.instanceId).toBe(placedCard.instanceId);
    expect(p0.hand.some((c) => c.instanceId === placedCard.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in runSecurityManipulation case "placeAsSecurity", short-circuit the
  // loose-source branch (`if (fromLoose) return;`) — nothing enters security, the bottom-card
  // assertion goes RED. Alternatively revert the evaluateCondition "bindingExists" gate (ref
  // "digivolvedByThisEffect") and the placement never runs (RED).
});

describe("BT16-063 — DNA-only security placement and opponent-Digimon immunity", () => {
  it("places only an eligible opponent Digimon and carries the structured DNA gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-063", dp: 8000, as: "sourcePermanent" }],
          security: Array(5).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT16-063", dp: 8000, as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const sourcePermanent = s.perm("sourcePermanent");
    const target = s.perm("target");
    const targetInstanceId = target.topCard!.instanceId;

    const engineInternals = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = engineInternals.cardSourceOf(sourcePermanent.topCard!);
    const module = getEffectModule("BT16-063")!;
    const effects = module.effectsForTiming(EffectTiming.WhenDigivolving, source as never);
    const compiled = getCompiledCard("BT16-063")!;
    const placement = compiled.effects
      .find((effect) => effect.trigger === "WhenDigivolving")!
      .actions.find((action) => action.kind === "SecurityManipulation") as {
      condition?: { kind?: string };
      source?: { filter?: { level?: { lte?: { kind?: string } } } };
    };
    const grant = compiled.effects
      .find((effect) => effect.trigger === "WhenDigivolving")!
      .actions.find((action) => action.kind === "GrantStatic") as { grant?: string };

    expect(grant.grant).toBe("immuneToOpponentDigimonEffects");
    expect(placement.condition?.kind).toBe("isDnaDigivolving");
    expect(placement.source?.filter?.level?.lte?.kind).toBe("chooseEitherSecurityCount");

    const context = engineInternals.buildEffectContext(source, { isDnaDigivolve: true });
    for (const effect of effects) await effect.resolve(context);
    await settle(() => p1.security.some((card) => card.instanceId === targetInstanceId));

    expect(p1.battleArea.some((permanent) => permanent.permanentId === target.permanentId)).toBe(false);
    expect(p1.security.some((card) => card.instanceId === targetInstanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

// ---------------------------------------------------------------------------
// 4) GrantStatic — BT8-061 [Rule] this card's name is also treated as [Mamemon]
//    (grant: "name"). KB Q1744 confirms the name-also-treated rule.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — GrantStatic (BT8-061 name also treated as [Mamemon])", () => {
  it("grants the [Mamemon] name to the source permanent via the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-061", dp: 6000, as: "carrier" }] } });
    const carrier = s.perm("carrier");

    // The continuous (EffectTiming.None) GrantStatic resolves through the real interpreter.
    await recompute(s);

    // The ledger stores granted names lowercased (the name-comparison normal form).
    const names = continuousLedger(s)
      .grantedNames(carrier.permanentId)
      .map((n) => n.toLowerCase());
    expect(names).toContain("mamemon");
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "GrantStatic", short-circuit the name/trait branch
  // (`if (action.grant === "name" || action.grant === "trait") return false;`). grantedNames no
  // longer includes "Mamemon" -> `toContain("Mamemon")` goes RED.
});

// ---------------------------------------------------------------------------
// 5) AddToHandSelf — BT1-093 [Security] add this Option card to the hand.
//    The interpreter verb returns the source instance to its owner's hand.
//    Driven through the production interpreter via the registered effect module.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — AddToHandSelf (BT1-093 [Security] add this card to hand)", () => {
  it("returns the security source card to its owner's hand", async () => {
    // BT1-093 sits face-down in seat 0's security; its [Security] effect adds it to hand.
    const s = setupEngine({ 0: { security: [{ card: "BT1-093", as: "sec" }] } });
    const p0 = s.state.players[0] as PlayerState;
    const sec = s.inst("sec");

    // Resolve BT1-093's [Security] effect through the REAL interpreter module (the security
    // effect is the AddToHandSelf leg; build a CardSource bound to the security instance).
    const compiled = getCompiledCard("BT1-093")!;
    const module = getEffectModule("BT1-093")!;
    const securityEffect = compiled.effects.find((e) => e.isSecurity);
    expect(securityEffect, "BT1-093 has a [Security] effect").toBeDefined();

    const ctx = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = ctx.cardSourceOf(sec);
    const effects = module.effectsForTiming(EffectTiming.SecuritySkill, source as never);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    const effContext = ctx.buildEffectContext(source, {});
    for (const e of effects) await e.resolve(effContext);

    // The security card was added to hand (and removed from the security stack).
    expect(p0.hand.some((c) => c.instanceId === sec.instanceId)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === sec.instanceId)).toBe(false);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "AddToHandSelf", replace
  // `await ctx.fx.returnToHand([ctx.source.instanceId])` with `return false;`. The card never
  // reaches the hand -> `toContain`/`some(...hand)` goes RED.
});

// ---------------------------------------------------------------------------
// 6) ActivateMain — BT13-106 [Main] "activate this card's [Main] effect" (the
//    sibling [Main] gives an opponent Digimon -3000 DP). Driven through the real
//    activateEffect player verb. KB Q2356 confirms the -3000-DP-to-0 semantics.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — ActivateMain (BT1-094 [Security] activates its own [Main] Delete)", () => {
  it("the [Security] ActivateMain runs the sibling [Main]: deletes the opponent <Blocker> Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          // BT1-094 sits in seat 0's security; its [Security] effect is "activate this card's [Main]
          // effect", and the sibling [Main] deletes 1 opponent Digimon WITH <Blocker>.
          security: [{ card: "BT1-094", as: "sec", faceUp: true }],
        },
        1: {
          // EX6-044 prints <Blocker> -> a legal [Main]-Delete target (the only eligible candidate).
          battleArea: [{ card: "EX6-044", dp: 4000, as: "target" }],
          // Keep seat 1 from losing if any security check happens.
          security: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const sec = s.inst("sec");
    const target = s.perm("target");

    const module = getEffectModule("BT1-094")!;
    const ctx = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = ctx.cardSourceOf(sec);
    const effects = module.effectsForTiming(EffectTiming.SecuritySkill, source as never);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    const effContext = ctx.buildEffectContext(source, {});
    for (const e of effects) await e.resolve(effContext);
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    // The [Security] ActivateMain ran the sibling [Main] Delete: the <Blocker> Digimon is gone.
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in runActivateMain, replace the resolve loop body with `return;` (run no
  // [Main] effect). The [Main] Delete never runs -> the <Blocker> Digimon survives ->
  // `battleArea.some(...) toBe(false)` goes RED.
});

// ---------------------------------------------------------------------------
// 7) SelectBind — BT12-108 [Main] bind 1 of your [Machine]/[Cyborg] Digimon as "A",
//    then Delete all opponent Digimon with DP <= A's DP (the Delete's relativeTo
//    consumes the bind handle). documented behavior confirms the bind-then-delete-by-DP.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — SelectBind (BT12-108 [Main] binds a Digimon, deletes opp Digimon <= its DP)", () => {
  it("deletes the opponent Digimon at/below the BOUND Digimon's DP and spares one above it", async () => {
    const s = setupEngine(
      {
        0: {
          // The bind subject: a friendly [Cyborg]-trait Digimon (BT1-024 MetalTyrannomon) at 5000 DP.
          battleArea: [{ card: "BT1-024", dp: 5000, as: "bound" }],
          hand: [{ card: "BT12-108", as: "sourceInst", faceUp: true }],
        },
        1: {
          // Opponent board: one Digimon at 5000 (<= bound DP -> deleted) and one at 7000 (spared).
          battleArea: [
            { card: "AD1-001", dp: 5000, as: "inRange" },
            { card: "AD1-001", dp: 7000, as: "above" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const inRange = s.perm("inRange");
    const above = s.perm("above");

    // Resolve BT12-108's [Main] (SelectBind -> Delete) through the REAL interpreter module. The
    // Option's [Main] body fires at OnUseOption; drive it directly with a context bound to the
    // played instance so the SelectBind handle and its dependent Delete share one selection store.
    const sourceInst = s.inst("sourceInst");
    const module = getEffectModule("BT12-108")!;
    const ctx = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = ctx.cardSourceOf(sourceInst);
    const effects = module.effectsForTiming(EffectTiming.OnUseOption, source as never);
    expect(effects.length, "BT12-108 surfaces its [Main] at OnUseOption").toBeGreaterThanOrEqual(1);
    const effContext = ctx.buildEffectContext(source, {});
    for (const e of effects) await e.resolve(effContext);
    await settle(() => !p1.battleArea.some((p) => p.permanentId === inRange.permanentId));

    // The bound DP (5000) gated the Delete: the 5000-DP opponent Digimon is gone, the 7000 stays.
    expect(p1.battleArea.some((p) => p.permanentId === inRange.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === above.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "SelectBind", skip recording the handle
  // (`if (ids.length > 0 && ctx.selections) ctx.selections.set(name, ids[0]!)` -> `return false;`).
  // The dependent Delete's `relativeTo.selectionRef: "A"` then resolves to nothing (no bound DP) ->
  // NO opponent Digimon is deleted -> the `inRange ... toBe(false)` assertion goes RED.
});

// ---------------------------------------------------------------------------
// 8) Replacement — BT18-082 [All Turns][Once Per Turn] "when this Digimon would
//    leave the battle area, ... it doesn't leave." (self-protect wouldLeavePlay
//    prevent). The reaction is installed via the real interpreter (runReplacement);
//    the engine's deletePermanent consults leave-prevention, so the carrier SURVIVES
//    a deletion it would otherwise suffer (the replacement substitutes the outcome).
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — Replacement (BT18-082 prevents its own removal: it doesn't leave)", () => {
  it("the carrier SURVIVES a deletion because its wouldLeavePlay prevent replaces the outcome", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-082", dp: 8000, as: "carrier" }],
          // A security card to pay the "trash the bottom of your security stack" prevention cost.
          security: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const carrier = s.perm("carrier");

    // The continuous recompute resolves BT18-082's [All Turns] Replacement through the real
    // interpreter, installing the self-protect prevent reaction.
    await recompute(s);

    // Drive a real deletion through the engine's primitive; deletePermanent consults
    // leave-prevention, which fires the installed replacement.
    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<void> } }).primitives;
    await fx.deletePermanent([carrier.permanentId]);
    await settle(() => false, 30);

    // The replacement substituted the deletion: the carrier is STILL on the battle area
    // (and was NOT moved to the trash).
    expect(p0.battleArea.some((p) => p.permanentId === carrier.permanentId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === carrier.topCard?.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "Replacement", replace `runReplacement(ctx, action)`
  // with `return false;` (install nothing). No prevent reaction is registered -> deletePermanent
  // removes the carrier -> `battleArea.some(...)` goes RED (the carrier is trashed).
});

// ---------------------------------------------------------------------------
// 9) Digivolve (IR action) — BT16-093 [Main] digivolve 1 of your [Rapidmon]/
//    [Gargomon] Digimon into a [Rapidmon] card from hand, without paying the cost.
//    runDigivolve calls digivolveFromInstance; the base's top card becomes Rapidmon.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — Digivolve (BT16-093 [Main] digivolve into the named [Rapidmon])", () => {
  it("digivolves the [Gargomon] base into the [Rapidmon] result card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          // The base: a friendly [Gargomon]-named Lv.4 Green Digimon (BT3-048) on the board.
          battleArea: [{ card: "BT3-048", dp: 5000, as: "base" }],
          hand: [
            // The result card to digivolve INTO: a [Rapidmon]-named Lv.5 Green Digimon in hand
            // (BT3-052, EvoCost Green Lv.4 — satisfied by the Gargomon base).
            { card: "BT3-052", as: "into" },
            { card: "BT16-093", as: "sourceInst", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("base");
    s.state.memory = 10;

    // Resolve BT16-093's [Main] Digivolve through the REAL interpreter module (Option [Main]
    // body at OnUseOption); digivolveFromInstance stacks the result onto the base.
    const sourceInst = s.inst("sourceInst");
    const module = getEffectModule("BT16-093")!;
    const ctx = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = ctx.cardSourceOf(sourceInst);
    const effects = module.effectsForTiming(EffectTiming.OnUseOption, source as never);
    expect(effects.length, "BT16-093 surfaces its [Main] Digivolve").toBeGreaterThanOrEqual(1);
    const effContext = ctx.buildEffectContext(source, {});
    for (const e of effects) await e.resolve(effContext);
    await settle(() => base.topCard?.cardId === "BT3-052");

    // The base digivolved: its top card is now the named [Rapidmon] result, and the prior
    // Gargomon top moved into the digivolution stack.
    expect(base.topCard?.cardId).toBe("BT3-052");
    expect(base.stack.some((c) => c.cardId === "BT3-048")).toBe(true);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in runDigivolve, short-circuit before the loop (`return;` right after the
  // `into === undefined` guard). digivolveFromInstance never runs -> the base's top stays BT3-048
  // -> `toBe("BT3-052")` goes RED.
});

// ---------------------------------------------------------------------------
// 10) Link — BT22-039 links an [Appmon] <Link> card and REJECTS a non-<Link> card,
//     gated by the Phase-4 `linkEligible` guard. Re-proves the kind via the full
//     GameEngine play path (a friendly Digimon's play arms BT22-039's whenPlayed link).
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — Link (BT22-039 links an [Appmon] <Link> card, gated by linkEligible)", () => {
  it("links BT21-009 (Appmon + <Link>) and does NOT link BT22-016 (Appmon, no <Link>)", async () => {
    const s = setupEngine(
      {
        0: {
          // BT22-039 on the field carrying two Appmon digivolution cards: BT22-016 (no <Link>)
          // FIRST so it is the first candidate, then BT21-009 (<Link>). Without the linkEligible
          // guard the count:1 link would pick the ineligible BT22-016.
          battleArea: [
            { card: "BT22-039", dp: 4000, as: "ouranosmon", under: ["BT22-016", "BT21-009"] },
            // A friendly recipient for the linked card.
            { card: "BT1-009", dp: 4000, as: "recipient" },
          ],
          // A cheap Digimon whose play arms the watcher.
          hand: [{ card: "BT1-009", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const trigger = s.inst("trigger");
    s.state.memory = 10;

    await recompute(s);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId })).toEqual({ ok: true });

    const linkedCardIds = (): string[] => {
      const ids: string[] = [];
      for (const p of (s.state.players[0] as PlayerState).battleArea) for (const c of p.linked) ids.push(c.cardId);
      return ids;
    };
    await settle(() => linkedCardIds().length > 0);

    // The <Link>-carrying Appmon card was linked; the no-<Link> card was NOT.
    expect(linkedCardIds()).toContain("BT21-009");
    expect(linkedCardIds()).not.toContain("BT22-016");
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: remove the `.filter(...linkEligible...)` wire-up in runLink (interpreter.ts)
  // — already RED-proven in linkEligible.test.ts. The count:1 link then picks the FIRST candidate
  // (BT22-016) -> `not.toContain("BT22-016")` goes RED.
});

// ---------------------------------------------------------------------------
// 11) MindLink — BT15-086 [Main] Mind-Link: place 1 of your [Machine]/[Cyborg]/[SoC]
//     Digimon under this Tamer (relocatePermanent). The targeted Digimon leaves the
//     battle area and its top card sits in the Tamer's stack.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — MindLink (BT15-086 [Main] places the Tamer under the partner Digimon)", () => {
  it("relocates the Mind-Link Tamer under the [Cyborg] partner (the Tamer leaves the battle area)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // The Mind-Link host Tamer (BT15-086) on the board as the effect source.
            { card: "BT15-086", dp: 0, as: "tamer" },
            // The Mind-Link partner: a friendly [Cyborg]-trait Digimon (BT1-024 MetalTyrannomon).
            { card: "BT1-024", dp: 5000, as: "partner" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const tamer = s.perm("tamer");
    const tamerInst = tamer.topCard!;
    const partner = s.perm("partner");

    const module = getEffectModule("BT15-086")!;
    const ctx = s.engine as unknown as {
      buildEffectContext(source: unknown, trigger: unknown): EffectContext;
      cardSourceOf(instance: CardInstance): unknown;
    };
    const source = ctx.cardSourceOf(tamerInst);
    // A Tamer's [Main] activated ability is reached at OnDeclaration (the activateEffect window).
    const effects = module.effectsForTiming(EffectTiming.OnDeclaration, source as never);
    expect(effects.length, "BT15-086 surfaces its [Main] MindLink").toBeGreaterThanOrEqual(1);
    const effContext = ctx.buildEffectContext(source, {});
    for (const e of effects) await e.resolve(effContext);
    await settle(() => !p0.battleArea.some((p) => p.permanentId === tamer.permanentId));

    // The Mind-Link pairing applied: the Tamer was placed UNDER the partner Digimon — it left
    // the battle area and the Tamer's card now sits in the partner's digivolution stack.
    expect(p0.battleArea.some((p) => p.permanentId === tamer.permanentId)).toBe(false);
    expect(partner.stack.some((c) => c.instanceId === tamerInst.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in runMindLink, replace the relocate loop body
  // (`ctx.fx.relocatePermanent(...)`) with `continue;`. The Tamer stays on the battle area and
  // the partner's stack stays empty -> both assertions go RED.
});

// ---------------------------------------------------------------------------
// 12) RestrictCostReduction — BT5-021 "[Opponent's Turn] Your opponent can't reduce
//     digivolution costs". The carrier registers the cost-reduction block via the
//     continuous recompute ON THE OPPONENT'S TURN (the IR's OpponentsTurn turn-owner
//     guard); the consume read (blocksCostReduction) reports the opponent is blocked.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — RestrictCostReduction (BT5-021 opponent can't reduce digivolve cost)", () => {
  it("blocks the OPPONENT's digivolve-cost reduction (and leaves the source seat free)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-021", dp: 5000, as: "carrier" }] } });

    // The card is [Opponent's Turn]-gated: it is live while the carrier's OPPONENT is the
    // turn player (the only turn a digivolve by that opponent can happen).
    s.state.turnSeat = 1;
    // The RestrictCostReduction resolves through the real interpreter on recompute.
    await recompute(s);

    const ledgerRead = continuousLedger(s) as unknown as {
      blocksCostReduction(seat: Seat, costType: "play" | "digivolve"): boolean;
    };
    // The opponent (seat 1) is blocked from digivolve-cost reduction; the source seat is not.
    expect(ledgerRead.blocksCostReduction(1, "digivolve")).toBe(true);
    expect(ledgerRead.blocksCostReduction(0, "digivolve")).toBe(false);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "RestrictCostReduction", replace the loop body
  // (`ctx.fx.restrictCostReduction(seat, action.costType, duration)`) with nothing (`return false;`).
  // No block is recorded -> `blocksCostReduction(1, "digivolve")` is false -> the assertion goes RED.
});

// ---------------------------------------------------------------------------
// 13) RestrictMemoryGain — BT3-046 [Static] your opponent can't gain memory by effects
//     (except Tamer effects). The carrier registers the memory-gain policy on recompute;
//     the production memory-gain path (MemoryGauge.addMemoryForSeat) then blocks the
//     opponent's Digimon-effect memory gain.
// ---------------------------------------------------------------------------
describe("IR-02 Tier-1 — RestrictMemoryGain (BT3-046 opponent can't gain memory by effect)", () => {
  it("blocks the OPPONENT's effect-driven memory gain (a Digimon effect cannot raise it)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-046", dp: 5000, as: "carrier" }] } });

    await recompute(s);

    const ledgerRead = continuousLedger(s);
    // The opponent (seat 1) may NOT gain memory from a Digimon effect; a Tamer effect is exempt.
    expect(
      ledgerRead.canGainMemoryFromEffect(1, { definition: { kinds: ["Digimon"] } }),
      "opponent Digimon-effect memory gain is blocked",
    ).toBe(false);
    expect(
      ledgerRead.canGainMemoryFromEffect(1, { definition: { kinds: ["Tamer"] } }),
      "opponent Tamer-effect memory gain is exempt (exceptTamerEffects)",
    ).toBe(true);
    // The source seat (0) is unaffected.
    expect(ledgerRead.canGainMemoryFromEffect(0, { definition: { kinds: ["Digimon"] } })).toBe(true);
    assertNoLoudGap(s);
  });

  // REVERT-CONFIRM-RED: in interpreter.ts case "RestrictMemoryGain", replace the loop body
  // (`ctx.fx.restrictMemoryGain(seat, duration)`) with nothing (`return false;`). No policy is
  // recorded -> canGainMemoryFromEffect(1, Digimon) is true -> the `toBe(false)` assertion goes RED.
});
