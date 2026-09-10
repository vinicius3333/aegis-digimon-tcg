import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-091.js";
import "./index.js";

// A3 for BT20-091 (Cool Boy) — [Your Turn] Tamer: when your Digimon are played or
// digivolve, if any of them have the [Royal Knight] trait, by suspending this Tamer,
// <Draw 1> and gain 1 memory.
//
// Public proofs below play and digivolve a Royal Knight through the engine's normal actions,
// and play a non-Royal Knight as the negative controller. This keeps the trigger-subject and
// Your Turn gates on their real lifecycle paths.

// AD1-008 (Gallantmon) has types: ["Holy Warrior", "Royal Knight"].
// BT3-073 (WereGarurumon) has types: ["Warrior", "Virus"] — no Royal Knight.
const ROYAL_KNIGHT_CARD = "AD1-008"; // Gallantmon — Royal Knight trait
const NON_ROYAL_KNIGHT_CARD = "BT3-073"; // WereGarurumon — no Royal Knight
const COOL_BOY = "BT20-091";
const OMEKAMON = "BT20-083"; // Omekamon printing

describe("BT20-091 [Your Turn] when Royal Knight played/digivolves, suspend to draw+memory", () => {
  it("encodes all printed clauses without residuals", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
        },
      ],
    });
    for (const watcher of compiled.effects[0]?.actions ?? []) {
      expect((watcher as { actions?: unknown[] }).actions).toMatchObject([
        { kind: "Draw", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "GainMemory", condition: { kind: "ifThisEffectActed" } },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("publishes the white Tamer stats and exact printed identity", () => {
    expect(getCardDefinition(COOL_BOY)).toMatchObject({
      nameEn: "Cool Boy",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
    });
  });

  it("publicly plays a [Royal Knight] and pays Cool Boy's suspension cost for draw and memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COOL_BOY, dp: 0, as: "coolBoy" }],
          hand: [{ card: ROYAL_KNIGHT_CARD, as: "royalKnight" }, "BT1-010"],
          deck: [{ card: "BT1-010", faceUp: false }, "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("royalKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("royalKnight").instanceId),
    );
    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(-1); // 10 - printed play cost 12 + Cool Boy's 1.
  });

  it("publicly evolves into a [Royal Knight] and pays Cool Boy's suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COOL_BOY, dp: 0, as: "coolBoy" },
            { card: "AD1-003", as: "base" },
          ],
          hand: [{ card: ROYAL_KNIGHT_CARD, as: "royalKnight" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("royalKnight").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === ROYAL_KNIGHT_CARD);
    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(1); // 4 - printed evolution cost 4 + Cool Boy's 1.
  });

  it("does NOT draw when a played Digimon has no [Royal Knight] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COOL_BOY, dp: 0, as: "coolBoy" }],
          hand: [{ card: NON_ROYAL_KNIGHT_CARD, as: "nonRoyalKnight" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonRoyalKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("nonRoyalKnight").instanceId),
    );
    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore - 1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(-1); // 10 - printed play cost 11; no Cool Boy gain.
  });
});

// A3 for BT20-091's [Opponent's Turn][Once Per Turn] leave-play clause: "When any of your
// Digimon with the [Royal Knight] trait would leave the battle area, you may play 1
// [Omekamon] from your hand without paying the cost."
//
// FAILS-WHEN-REVERTED: with BT20-091 on the battle area (subscription installed when it
// entered) and a [Royal Knight] Digimon deleted on the opponent's turn, Omekamon is played
// from hand for free. Reverting either the `mode: "instead"` dispatch in leavePrevention.ts
// or this card's `subscribeReplacement` install makes the clause inert — the leaving
// permanent still dies (rule DP-0 deletion), but Omekamon never enters play.
describe("BT20-091 [Opponent's Turn][Once Per Turn] play Omekamon when a Royal Knight leaves", () => {
  it("plays Omekamon from hand when a [Royal Knight] Digimon is deleted on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" }],
          hand: [
            { card: COOL_BOY, as: "coolBoy" },
            { card: OMEKAMON, as: "omekamon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    // Leave 3 memory after playing Cool Boy so the public pass-turn bonus ends the
    // preceding turn at the neutral gauge before the next seat starts.
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coolBoy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("coolBoy").instanceId),
    );

    // Cross the turn boundary through the public turn loop, then delete the Royal Knight by effect
    // during the opponent's main phase so the replacement's turn gate is live naturally.
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    // runOneTurn drives one complete turn but intentionally does not switch seats; hand the
    // turn and re-frame the memory after the real seat-0 End phase, preserving the natural
    // phase lifecycle for the opponent's turn.
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.deletePermanent([royalKnightId], "byEffect");
    await settle(() => !(p0?.hand.some((c) => c.instanceId === omekamonInstanceId) ?? true));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // The Royal Knight actually left (the "instead" reaction does NOT prevent the leave).
    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    // Omekamon was played from hand without paying its cost — no longer in hand, now on the
    // battle area.
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(false);
    expect(p0?.battleArea.some((p) => p.topCard?.cardId === OMEKAMON)).toBe(true);
  });

  it("does NOT play Omekamon on the [Royal Knight]'s OWN controller's turn (opponent's-turn gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" }],
          hand: [
            { card: COOL_BOY, as: "coolBoy" },
            { card: OMEKAMON, as: "omekamon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coolBoy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("coolBoy").instanceId),
    );

    // Still seat 0's own turn when the Royal Knight leaves by effect.
    await advance(s.engine).verb.deletePermanent([royalKnightId], "byEffect");

    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    // Omekamon stayed in hand: the clause is [Opponent's Turn] only.
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(true);
  });
});

describe("BT20-091 Security deployment", () => {
  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      1: { security: [{ card: COOL_BOY, as: "securityCoolBoy" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY)).toBe(true);
  });
});
