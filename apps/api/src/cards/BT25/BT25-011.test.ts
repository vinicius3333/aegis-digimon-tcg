import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_011 } from "./BT25-011.js";
import "../index.js";

describe("BT25-011 Aquilamon", () => {
  it("suspends one opponent Digimon, then conditionally offers Silphymon DNA", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_011.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "DnaDigivolve",
        optional: true,
        payCost: true,
        condition: { kind: "isYourTurn" },
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Silphymon"], match: "name" }] },
      });
    }
  });

  it("preserves Raid and inherited +2000 DP", () => {
    expect(BT25_011.effects?.some((entry) => entry.keywords?.[0]?.keyword === "Raid")).toBe(true);
    expect(BT25_011.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("suspends an opponent and DNA-digivolves from a real play origin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "yellowMaterial" }],
          hand: [
            { card: "BT25-011", as: "aquilamon" },
            { card: "BT16-012", as: "silphymon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT16-012"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("BT16-012");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("silphymon").instanceId);
  });

  it("keeps the printed catalog identity and alternate evolution route", () => {
    expect(getCardDefinition("BT25-011")).toMatchObject({
      colors: ["Red", "Green"],
      level: 4,
      playCost: 4,
      dp: 4000,
      types: ["Giant Bird", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor("BT25-011")).toEqual([
      { names: ["Hawkmon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });
});
