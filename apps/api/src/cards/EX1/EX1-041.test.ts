import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-041.js";

describe("EX1-041 Dinobeemon", () => {
  it("suspends a 5000 DP-or-less opponent when digivolving over Free", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-038", as: "base" }], hand: [{ card: "EX1-041", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-070", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend a target when the digivolution stack has no Free card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-070", as: "base" }], hand: [{ card: "EX1-041", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-070", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-041");
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("gains 1 memory when a legal Imperialdramon stack wins a real battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory when another Digimon wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] },
          { card: "BT1-070", as: "otherAttacker", dp: 4000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
  });

  it("does not gain memory when the Imperialdramon host loses the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"], dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 10000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
  });
});
