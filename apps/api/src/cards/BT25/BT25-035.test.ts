import { describe, expect, it } from "vitest";
import { compiled as BT25_035 } from "./BT25-035.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-035 Cougarmon", () => {
  it("requires exactly two bottom face-down cards under Tamers for the optional digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_035.effects?.find((entry) => entry.trigger === trigger);
      const digivolve = effect?.actions?.[1] as { kind?: string; optional?: boolean; cost?: Record<string, unknown> };
      expect(digivolve.kind).toBe("Digivolve");
      expect(digivolve.optional).toBe(true);
      expect(digivolve.cost).toMatchObject({
        kind: "trashBottomFaceDownUnderTamer",
        controller: "mine",
        count: 2,
      });
    }
  });

  it("keeps the -3000 DP effect independent of the cost payment", () => {
    for (const effect of BT25_035.effects?.filter((entry) =>
      ["OnPlay", "WhenDigivolving"].includes(String(entry.trigger)),
    ) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("naturally plays, reduces an opposing Digimon, and free-digivolves by aggregating two Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "glowingDawn" },
          ],
          battleArea: [
            { card: "BT25-090", as: "firstTamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "BT25-090", as: "secondTamer", under: [{ card: "BT1-002", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-041"));

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT25-041");
    expect(evolved?.topCard?.cardId).toBe("BT25-041");
    expect(s.state.memory).toBe(0);
    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.perm("firstTamer").stack).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });

  it("does not free-digivolve when only one bottom face-down Tamer card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-035", as: "cougarmon" },
            { card: "BT25-041", as: "glowingDawn" },
          ],
          battleArea: [{ card: "BT25-090", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-035"));

    expect(s.perm("cougarmon").topCard?.cardId).toBe("BT25-035");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });
});
