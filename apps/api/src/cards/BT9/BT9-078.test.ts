import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-078.js";
describe("BT9-078 DexDoruGreymon", () => {
  it("matches catalog and independent memory and conditional deletion IR", () => {
    expect(getCardDefinition("BT9-078")).toMatchObject({
      cardId: "BT9-078", nameEn: "DexDoruGreymon", colors: ["Purple", "Black"], kinds: ["Digimon"], level: 5,
      playCost: 8, dp: 8000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 4 }, { color: "Black", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"], attributes: ["Virus"], types: ["Undead", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["DoruGreymon"], cost: 1, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "GainMemory", amount: 1, optional: true, cost: { kind: "trash" } }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } }, condition: { kind: "anyOf" } }] },
      ],
    });
  });

  it("deletes a level 4 Digimon when evolving over DoruGreymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-064", as: "base" }],
          hand: [
            { card: "BT9-078", as: "evolving" },
            { card: "BT9-075", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
