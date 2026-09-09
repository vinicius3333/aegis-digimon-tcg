import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-010.js";
import "../index.js";

describe("EX4-010 BlackWarGrowlmon", () => {
  it("has the official identity and uses the post-mill combined-trash DP ceiling", () => {
    expect(getCardDefinition("EX4-010")).toMatchObject({
      cardId: "EX4-010",
      nameEn: "BlackWarGrowlmon",
      colors: ["Red", "Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
    });
    expect(digivolutionRequirementsFor("EX4-010")).toContainEqual({
      level: 4,
      names: ["Growlmon"],
      cost: 3,
      isAlternate: true,
    });
    expect(runtimeCompiledCard("EX4-010")).toMatchObject({ coverage: "full", residual: [] });
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 3 });
    expect(actions[1]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 0, upTo: true, totalDpCap: 3000 },
      dpCeiling: 3000,
      totalDpCapScaling: { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } },
    });
  });

  it.each([
    ["red level 4", "EX4-008", false, 0],
    ["purple level 4", "EX3-058", false, 0],
    ["Growlmon in name", "BT12-010", true, 1],
  ])("digivolves through the printed %s route", async (_route, baseCard, useAlternateCost, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blackWarGrowlmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-010");

    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("base").topCard.cardId).toBe("EX4-010");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
  });

  it("rejects the explicit Growlmon alternate route from a nonmatching level-3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blackWarGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("blackWarGrowlmon").instanceId,
    );
  });

  it("deletes opponent Digimon whose combined DP fits the post-trash ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          trash: ["BT1-013", "BT1-014"],
          battleArea: [{ card: "EX4-008", as: "base" }],
          hand: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-015", "BT1-016", "BT1-017", "BT1-019"],
          trash: ["BT1-018", "BT1-019"],
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-009", as: "small", dp: 2000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blackWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-019"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q3446 floors each 10-card increment after both mandatory mills", async () => {
    const below = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          trash: Array(7).fill("BT1-013"),
          battleArea: [{ card: "EX4-008", as: "base" }],
          hand: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-018"],
          trash: Array(6).fill("BT1-017"),
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
        },
      },
      { autoSelectCards: true },
    );
    below.state.memory = 4;
    await below.ready();
    expect(
      below.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: below.perm("base").permanentId,
        instanceId: below.inst("blackWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => below.state.players[0]!.trash.length + below.state.players[1]!.trash.length === 19);

    expect(below.state.players[0]!.trash.length + below.state.players[1]!.trash.length).toBe(19);
    expect(below.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      below.perm("target").permanentId,
    );

    const atThreshold = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          trash: Array(8).fill("BT1-013"),
          battleArea: [{ card: "EX4-008", as: "base" }],
          hand: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-018"],
          trash: Array(6).fill("BT1-017"),
          battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }],
        },
      },
      { autoSelectCards: true },
    );
    atThreshold.state.memory = 4;
    await atThreshold.ready();
    expect(
      atThreshold.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: atThreshold.perm("base").permanentId,
        instanceId: atThreshold.inst("blackWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => atThreshold.state.players[1]!.battleArea.length === 0);

    // The six milled cards make the combined trash count 20 (11 + 9), so Q3446 grants +4000;
    // the deleted target is then the 21st trash card.
    expect(atThreshold.state.players[0]!.trash.length + atThreshold.state.players[1]!.trash.length).toBe(21);
    expect(atThreshold.state.players[1]!.battleArea).toHaveLength(0);
  });
});
