import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_064 } from "./BT24-064.js";
import "../index.js";

describe("BT24-064 Ouryumon", () => {
  it("triggers De-Digivolve when any Digimon or Tamer suspends", () => {
    const allTurns = BT24_064.effects?.find((entry) => entry.trigger === "AllTurns");
    const subTrigger = allTurns?.actions?.[0] as any;
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { kind: ["Digimon", "Tamer"] },
    });
    expect(subTrigger.sourceFilter.controllerDefault).toBeUndefined();
    expect(subTrigger.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
  });

  it("has Piercing and Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-064", as: "ouryumon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ouryumon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ouryumon"))).toBe(true);
  });

  it.each([
    ["normal black level-5 requirement", "BT10-064", false, 4],
    ["normal green level-5 requirement", "BT1-075", false, 4],
    ["alternate DigiPolice/SEEKERS requirement", "BT24-060", true, 3],
  ])(
    "uses the %s and plays a revealed cost-7 DigiPolice card",
    async (_label, baseCard, useAlternateCost, expectedCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT24-064", as: "ouryumon" }],
            deck: [
              { card: "BT24-060", as: "played" },
              { card: "BT1-001", as: "miss1" },
              { card: "BT1-002", as: "miss2" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("ouryumon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("ouryumon").instanceId);
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("played").instanceId,
        ),
      );

      expect(s.state.memory).toBe(5 - expectedCost);
    },
  );

  it("De-Digivolves 2 after either player's Tamer suspends, only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-064", as: "ouryumon" }] },
        1: {
          battleArea: [
            { card: "BT24-083", as: "tamer" },
            { card: "BT24-051", as: "first", under: ["BT24-050", "BT24-046"] },
            { card: "BT24-051", as: "second", under: ["BT24-050", "BT24-046"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    expect(s.perm("first").topCard.cardId).toBe("BT24-050");

    await advance(s.engine).verb.suspend([s.perm("ouryumon").permanentId]);
    expect(s.perm("second").topCard.cardId).toBe("BT24-051");
  });
});
