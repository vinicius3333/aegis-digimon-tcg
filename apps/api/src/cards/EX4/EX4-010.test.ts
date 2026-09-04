import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
    ["Growlmon in name", "EX4-008", true, 1],
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
  });

  it("deletes opponent Digimon whose combined DP fits the post-trash ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: ["BT1-013", "BT1-014"],
          battleArea: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-015", "BT1-016", "BT1-017"],
          trash: ["BT1-018", "BT1-019"],
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-009", as: "small", dp: 2000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackWarGrowlmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q3446 floors each 10-card increment after both mandatory mills", async () => {
    const below = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: Array(7).fill("BT1-013"),
          battleArea: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-014", "BT1-015", "BT1-016"],
          trash: Array(6).fill("BT1-017"),
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
        },
      },
      { autoSelectCards: true },
    );
    await below.ready();
    await advance(below.engine).fireForPermanent(EffectTiming.WhenDigivolving, below.perm("blackWarGrowlmon"));

    expect(below.state.players[0]!.trash.length + below.state.players[1]!.trash.length).toBe(19);
    expect(below.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      below.perm("target").permanentId,
    );

    const atThreshold = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: Array(7).fill("BT1-013"),
          battleArea: [{ card: "EX4-010", as: "blackWarGrowlmon" }],
        },
        1: {
          deck: ["BT1-014", "BT1-015", "BT1-016"],
          trash: Array(7).fill("BT1-017"),
          battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }],
        },
      },
      { autoSelectCards: true },
    );
    await atThreshold.ready();
    await advance(atThreshold.engine).fireForPermanent(
      EffectTiming.WhenDigivolving,
      atThreshold.perm("blackWarGrowlmon"),
    );
    await settle(() => atThreshold.state.players[1]!.battleArea.length === 0);

    // The six milled cards reach 20 before target selection; the deleted target is the 21st trash card.
    expect(atThreshold.state.players[0]!.trash.length + atThreshold.state.players[1]!.trash.length).toBe(21);
    expect(atThreshold.state.players[1]!.battleArea).toHaveLength(0);
  });
});
