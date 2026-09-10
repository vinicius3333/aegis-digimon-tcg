import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-046.js";
import "./BT1-021.js";

describe("BT1-021 MetalGreymon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.events.some((event) => event.kind === "memoryChanged" && event.to === 3)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("loses the 3 gained memory at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("still pays the delayed 3 memory after being deleted by the security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker", dp: 7000 }],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
      1: { security: ["BT1-025"], deck: ["BT1-014"], hand: ["BT1-014"] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 3 && !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("passes at 3 memory and then pays the delayed loss at the real end of turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker" }],
        deck: ["BT1-014"],
        hand: ["BT1-009"],
      },
      1: { security: ["BT1-010"], deck: ["BT1-014"] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[1]!.security.length === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.memory).toBe(-6);
  });

  it("triggers after evolving onto a red level 4 and keeps its delayed loss", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "BT1-021", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-010"] },
    });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[1]!.security.length === 0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("still loses 3 at turn end when Terriermon prevents the Digimon memory gain", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker" }],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT3-046", as: "terriermon" }],
        security: ["BT1-014"],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;

    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("rejects evolution from a green level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "base" }], hand: [{ card: "BT1-021", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
