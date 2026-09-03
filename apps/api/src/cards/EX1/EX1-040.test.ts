import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-040.js";

describe("EX1-040 MegaKabuterimon", () => {
  it("can digivolve into an Insectoid or Ancient Insect while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-040", as: "mega" }], hand: [{ card: "BT1-083", as: "evo" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT1-083");
    expect(s.perm("mega").topCard.instanceId).toBe(s.inst("evo").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("can choose the Ancient Insect branch while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-040", as: "mega" }], hand: [{ card: "BT7-054", as: "ancient" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT7-054");
    expect(s.perm("mega").topCard.cardId).toBe("BT7-054");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ancient").instanceId)).toBe(false);
  });

  it("may decline the can-digivolve action through the public attack flow", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-040", as: "mega" }], hand: [{ card: "BT1-083", as: "evo" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").isSuspended);
    expect(s.perm("mega").topCard.cardId).toBe("EX1-040");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
  });

  it("does not ignore evolution requirements for a trait match", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-040", as: "mega" }], hand: [{ card: "EX1-038", as: "lowerLevel" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").isSuspended);
    expect(s.perm("mega").topCard.cardId).toBe("EX1-040");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lowerLevel").instanceId)).toBe(true);
  });

  it("gains 1 memory when EX1-040 wins a real battle and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-040"] }] },
      1: { battleArea: [{ card: "BT1-066", as: "target", suspended: true, dp: 3000 }] },
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
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not gain memory when the EX1-040 attacker loses the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-040"], dp: 7000 }] },
      1: { battleArea: [{ card: "BT1-066", as: "target", suspended: true, dp: 10000 }] },
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
