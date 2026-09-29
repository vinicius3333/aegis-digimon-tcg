import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../EX2/EX2-060.js";
import "../EX2/EX2-070.js";
import "./BT7-017.js";

describe("BT7-017 Chaosdramon", () => {
  it("places a level-5 Cyborg as a source and deletes for each level-5 Cyborg source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT7-017", as: "evolving" },
            { card: "BT1-021", as: "cyborg" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
  });

  it("can place the optional Cyborg source even when no deletion target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT7-017", as: "evolving" },
            { card: "BT1-021", as: "cyborg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId));
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
  });
});

describe("BT7-017 Chaosdramon — KB Q&A rulings", () => {
  it("places the level 5 Cyborg source even when the opponent has no Digimon with 6000 DP or less (Q1520)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [{ card: "BT7-017", as: "evolving" }],
          trash: [{ card: "BT1-021", as: "cyborg" }],
        },
        1: { battleArea: [{ card: "BT7-024", as: "highDp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId));
    await settle();

    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("highDp").permanentId,
    ]);
  });

  it("digivolves Machinedramon into this card through an effect digivolution using the cost-1 route (Q1521)", async () => {
    const playPlugIn = async (baseCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "base" },
              { card: "EX2-060", as: "tamer" },
            ],
            hand: [
              { card: "EX2-070", as: "plugIn" },
              { card: "BT7-017", as: "chaosdramon" },
            ],
            deck: ["BT1-009", "BT1-013", "BT1-009", "BT1-013"],
            security: ["BT1-009", "BT1-013"],
          },
          1: { deck: ["BT1-009", "BT1-013", "BT1-009", "BT1-013"], security: ["BT1-009", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plugIn").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugIn").instanceId));
      await settle();
      return s;
    };

    const machinedramon = await playPlugIn("ST5-12");
    expect(machinedramon.perm("base").topCard.instanceId).toBe(machinedramon.inst("chaosdramon").instanceId);
    expect(machinedramon.perm("base").stack.map((card) => card.cardId)).toContain("ST5-12");

    const levelFiveBase = await playPlugIn("BT1-021");
    expect(levelFiveBase.perm("base").topCard.cardId).toBe("BT1-021");
    expect(
      levelFiveBase.state.players[0]!.hand.some(
        (card) => card.instanceId === levelFiveBase.inst("chaosdramon").instanceId,
      ),
    ).toBe(true);
  });
});
