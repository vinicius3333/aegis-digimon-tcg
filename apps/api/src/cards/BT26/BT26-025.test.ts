import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-025.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
describe("BT26-025 Liollmon", () => {
  it("compiles On Play and On Move security placement followed by Recovery +1", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "SecurityManipulation", op: "addTop", source: "deck", cost: { kind: "place", faceDown: true } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenMoving" });
  });
  it("compiles inherited once-per-turn security-to-hand and zero-security recovery", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop", condition: { kind: "securityAtMost", value: 0 } }] });
  });
  it("publicly places the top security card under a Glowing Dawn Tamer and recovers", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST23-14", as: "tamer" }], hand: [{ card: "BT26-025", as: "liollmon" }], security: [{ card: "BT1-009", as: "security" }], deck: [{ card: "BT1-010", as: "recovery" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === s.inst("recovery").instanceId));
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("does not recover when the security placement cost has no eligible Tamer", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-025", as: "liollmon" }],
        security: [{ card: "BT1-009", as: "security" }],
        deck: [{ card: "BT1-010", as: "notRecovered" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
  });

  it("pays the same placement cost and recovers when moving from breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT26-025", as: "mover" },
        battleArea: [{ card: "ST23-14", as: "tamer" }],
        security: [{ card: "BT1-009", as: "security" }],
        deck: [{ card: "BT1-010", as: "recovery" }],
      },
    }, { autoSelectCards: true });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: s.inst("security").instanceId, faceUp: false });
  });

  it("Q6986 inherited attack recovers from an empty security stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-027", as: "host", under: [{ card: "BT26-025" }] }],
        deck: [{ card: "BT1-010", as: "recovery" }],
      },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("recovery").instanceId, faceUp: false });
  });

  it("inherited attack may take the last security, then recovers, only once that turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-027", as: "host", under: [{ card: "BT26-025" }] }],
        security: [{ card: "BT1-009", as: "taken" }],
        deck: [
          { card: "BT1-010", as: "recovery" },
          { card: "BT1-011", as: "notRecovered" },
        ],
      },
    }, { autoAcceptOptional: true });
    const trigger = { attackerPermanentId: s.perm("host").permanentId };

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("taken").instanceId);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("recovery").instanceId, faceUp: false });

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("taken").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
  });

  it("uses the exact level-2 Glowing Dawn cost-0 evolution and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-025")).toContainEqual({
      level: 2,
      traits: ["Glowing Dawn"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        breeding: { card: "BT26-003", as: "glowingDawnEgg" },
        hand: [{ card: "BT26-025", as: "liollmon" }],
      },
    });
    expect(legal.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: legal.perm("glowingDawnEgg").permanentId,
      instanceId: legal.inst("liollmon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "plainEgg" },
        hand: [{ card: "BT26-025", as: "liollmon" }],
      },
    });
    expect(invalid.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: invalid.perm("plainEgg").permanentId,
      instanceId: invalid.inst("liollmon").instanceId,
      useAlternateCost: true,
    })).toEqual(expect.objectContaining({ ok: false }));
  });
});
