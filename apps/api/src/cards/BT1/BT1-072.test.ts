import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-072.js";

describe("BT1-072 Woodmon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-072", as: "digimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Blocker")).toBe(true);
  });

  it("can redirect an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 6000 }], security: ["BT1-011"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("retains Blocker after a legal green level 3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "BT1-072", as: "evolving" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-064");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-072", as: "attacker" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("can attack with less than 2 memory before its loss resolves (Q923)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-072", as: "attacker" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(-1);
  });

  it("does not grant Blocker while Woodmon is a digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "host", under: ["BT1-072"] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
