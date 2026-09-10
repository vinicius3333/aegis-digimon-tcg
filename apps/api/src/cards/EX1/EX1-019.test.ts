import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-019.js";

describe("EX1-019 Paildramon", () => {
  it("unsuspends when digivolving with a Free-trait card in its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-014", as: "base", suspended: true }], hand: [{ card: "EX1-019", as: "evo" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("EX1-019");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX1-014"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("makes an Imperialdramon host unblockable on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("imperialdramon"), "cantBeBlocked")).toBe(true);
  });

  it("does not unsuspend when the digivolution stack has no Free card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "base", suspended: true }], hand: [{ card: "EX1-019", as: "evo" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-019");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-032"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("rejects an illegal non-blue/non-green level-4 evolution without changing state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "invalidSource", suspended: true }],
        hand: [{ card: "EX1-019", as: "evo" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-014");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.perm("invalidSource").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-019"]);
  });

  it("prevents a real blocker from redirecting an Imperialdramon attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("imperialdramon"), "cantBeBlocked")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperialdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("can attack an opponent's suspended Digimon while unblockable (Q3205)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] },
      1: { battleArea: [{ card: "BT1-070", as: "suspended", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperialdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspended").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imperialdramon").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
  });

  it("allows a non-Imperialdramon host to be blocked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-019", as: "paildramon", under: ["EX1-014"] }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("paildramon"), "cantBeBlocked")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("applies the inherited restriction to the owning seat during that seat's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
      1: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("imperialdramon"), "cantBeBlocked")).toBe(true);
  });

  it("does not apply the unblockable restriction during the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("imperialdramon"), "cantBeBlocked")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
