import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-034.js";

describe("BT11-034 Cutemon", () => {
  it("matches the catalog and publishes the exact alternate evolution and instead branches", () => {
    expect(getCardDefinition("BT11-034")).toMatchObject({
      cardId: "BT11-034",
      nameEn: "Cutemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Fairy", "Xros Heart"],
    });
    expect(digivolutionRequirementsFor("BT11-034")).toContainEqual({
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            { kind: "PlaceUnder", target: { count: 1 }, condition: { kind: "not" } },
            { kind: "PlaceUnder", target: { count: 2, upTo: true }, condition: { kind: "anyOf" } },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-034"]).toEqual(compiled);
  });

  it("evolves for 0 from a non-yellow level-2 Xros Heart source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "BT11-034", as: "cutemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cutemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-034");
    expect(s.state.memory).toBe(3);
  });

  it("places 1 Xros Heart Digimon from trash under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-095", as: "tamer" }],
          hand: [{ card: "BT11-034", as: "cutemon" }],
          trash: [
            { card: "BT10-008", as: "xrosHeart" },
            { card: "BT10-019", as: "notXrosHeart" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cutemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("xrosHeart").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("notXrosHeart").instanceId);
  });

  it("places up to 2 when Dorulumon is in one of its Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-095", as: "tamer" },
            { card: "BT10-009", under: ["BT10-034"] },
          ],
          hand: [{ card: "BT11-034", as: "cutemon" }],
          trash: [
            { card: "BT10-008", as: "first" },
            { card: "BT10-012", as: "second" },
            { card: "BT10-009", as: "third" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cutemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.perm("tamer").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("uses the up-to-2 branch when Dorulumon is the top Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-095", as: "tamer" },
            { card: "BT10-034", as: "dorulumon" },
          ],
          hand: [{ card: "BT11-034", as: "cutemon" }],
          trash: [
            { card: "BT10-008", as: "first" },
            { card: "BT10-012", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cutemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });
});
