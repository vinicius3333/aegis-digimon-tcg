import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-061.js";

describe("BT1-061 Mistymon", () => {
  it("matches the catalog and exact compiled IR contract", () => {
    expect(getCardDefinition("BT1-061")).toMatchObject({
      cardId: "BT1-061",
      set: "BT1",
      nameEn: "Mistymon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Magic Warrior"],
      effectText: "[On Play] 2 of your opponent's Digimon get -3000 DP for the turn.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-061",
      nameJp: "ミスティモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2, forceSelection: true },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gives two opponent Digimon -3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "targetA", dp: 6000 },
            { card: "BT1-071", as: "targetB", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("targetA").currentDP === 3000 && s.perm("targetB").currentDP === 4000);

    expect([s.perm("targetA").currentDP, s.perm("targetB").currentDP]).toEqual([3000, 4000]);

    await advance(s.engine).runTurn(0);
    expect([s.perm("targetA").currentDP, s.perm("targetB").currentDP]).toEqual([6000, 7000]);
  });

  it("requires both targets when the opponent controls at least two Digimon (Q920)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
      1: { battleArea: ["BT1-070", "BT1-071", "BT1-072"] },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req.options).toMatchObject({ min: 2, max: 2 });
  });

  it("requires the only available Digimon when the opponent controls one (Q920)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req.options).toMatchObject({ min: 1, max: 1 });
  });

  it("digivolves through a legal yellow level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [{ card: "BT1-061", as: "mistymon" }],
        deck: [{ card: "BT1-050", as: "drawn" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mistymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mistymon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-056"]);
    expect(s.perm("base")).toMatchObject({ baseDP: 7000, currentDP: 7000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects a red level 4 despite matching the evolution level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "redBase" }], hand: [{ card: "BT1-061", as: "mistymon" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("mistymon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
