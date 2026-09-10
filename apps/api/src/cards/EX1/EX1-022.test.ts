import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-022.js";

describe("EX1-022 Imperialdramon: Dragon Mode", () => {
  it("evolves from a blue Lv.5 for exactly 3, draws 1, preserves the stack, and resolves the Free effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-019", as: "base", suspended: true, under: ["EX1-014"] }],
          hand: [{ card: "EX1-022", as: "evo" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.perm("opponent").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("EX1-022");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX1-014", "EX1-019"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("evolves from a green Lv.5 route for exactly 3 and keeps the legal source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-041", as: "base", suspended: true, under: ["EX1-038"] }],
        hand: [{ card: "EX1-022", as: "evo" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-022");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX1-038", "EX1-041"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("normal-evolves from a legal DNA-created Lv.5 stack with exact cost, draw, and source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-022", as: "blueMaterial" },
            { card: "BT12-050", as: "greenMaterial" },
          ],
          hand: [
            { card: "BT12-028", as: "dnaEvo" },
            { card: "EX1-022", as: "evo" },
          ],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-014", as: "filler" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("dnaEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT12-028"));
    const dnaStack = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT12-028")!;
    expect(dnaStack.stack.map(({ cardId }) => cardId)).toEqual(["BT12-022", "BT12-050"]);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: dnaStack.permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => dnaStack.topCard.cardId === "EX1-022");
    expect(dnaStack.stack.map(({ cardId }) => cardId)).toEqual(["BT12-022", "BT12-050", "BT12-028"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-014"]);
    expect(dnaStack.isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("gets only +1000 DP with four blue digivolution cards (Q3209)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX1-022",
            as: "imperialdramon",
            dp: 12000,
            under: ["BT1-032", "BT1-029", "BT1-034", "EX1-019"],
          },
        ],
      },
    });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(13000);
  });

  it("does not unsuspend or suspend an opponent without a Free source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-041", as: "base", suspended: true, under: ["BT1-032", "BT1-029", "BT1-034"] }],
          hand: [{ card: "EX1-022", as: "evo" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
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
    await settle(() => s.perm("base").topCard.cardId === "EX1-022");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-032", "BT1-029", "BT1-034", "BT1-041"]);
    expect(s.state.memory).toBe(2);
  });

  it("counts duplicate same-color sources only once", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "imperialdramon", dp: 12000, under: ["BT1-034", "EX1-019"] }],
      },
    });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(13000);
  });

  it("scales by distinct source colors, not source-card count", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", dp: 11000, under: ["BT1-034", "EX1-038"] }] },
    });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(13000);
  });

  it("rejects a red Lv.5 normal-evolution route without changing memory, hand, or stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "invalidSource", suspended: true }],
        hand: [{ card: "EX1-022", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-020");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-022"]);
  });

  it("rejects an invalid DNA route because EX1-022 has no DNA requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-019", as: "blueMaterial" },
          { card: "EX1-041", as: "greenMaterial" },
        ],
        hand: [{ card: "EX1-022", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX1-019", "EX1-041"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-022"]);
  });
});
