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
  });

  it("prevents a real blocker from redirecting an Imperialdramon attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-001", "BT1-001"] },
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
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
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
  });

  it("does not apply the unblockable restriction during the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-001"] },
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
