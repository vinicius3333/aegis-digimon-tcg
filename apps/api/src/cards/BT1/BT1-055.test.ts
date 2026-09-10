import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import angemon from "./BT1-055.js";

describe("BT1-055 Angemon", () => {
  it("matches the catalog and exact On Play target IR contract", () => {
    expect(getCardDefinition("BT1-055")).toMatchObject({
      cardId: "BT1-055",
      set: "BT1",
      nameEn: "Angemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 3000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Angel"],
      effectText: "[On Play] 1 of your opponent's Digimon gets -3000 DP for the turn.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-055",
      nameJp: "エンジェモン",
    });
    expect(getCardDefinition("BT1-055")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-055")?.securityEffectText).toBeUndefined();
    expect(angemon).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
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

  it("gives one opponent Digimon -3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-055", as: "angemon" }] },
        1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("reduces exactly one opposing Digimon when several are eligible", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-055", as: "angemon" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "first", dp: 6000 },
            { card: "BT1-070", as: "second", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 3000 || s.perm("second").currentDP === 3000);

    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort()).toEqual([3000, 6000]);
  });

  it("deletes an opposing Digimon reduced to 0 DP by the On Play effect", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-055", as: "angemon" }] },
        1: { battleArea: [{ card: "BT1-054", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetInstanceId = s.perm("target").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("resolves without a target when the opponent controls no Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-055", as: "angemon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
  });

  it("does not fire its On Play reduction when Angemon is digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [{ card: "BT1-055", as: "angemon" }],
        deck: [
          { card: "BT1-010", as: "evolutionDraw" },
          { card: "BT1-011", as: "mustStayInDeck" },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("angemon").instanceId);

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("mustStayInDeck").instanceId);
  });

  it("keeps its legal yellow level-3 evolution stack and mandatory evolution draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [{ card: "BT1-055", as: "angemon" }],
        deck: [
          { card: "BT1-010", as: "evolutionDraw" },
          { card: "BT1-011", as: "mustStayInDeck" },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("angemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});
