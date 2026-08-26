import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-067.js";

describe("BT9-067 Raidenmon", () => {
  it("matches errata, Q1854 partial placement, and Q1855 color thresholds in IR", () => {
    expect(getCardDefinition("BT9-067")).toMatchObject({
      cardId: "BT9-067", nameEn: "Raidenmon", colors: ["Black"], kinds: ["Digimon"], level: 6,
      playCost: 12, dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }, { color: "Black", level: 6, memoryCost: 2 }],
      forms: ["Mega"], attributes: ["Virus"], types: ["Machine"], imageId: "BT9-067-Errata",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlaceUnder" }, { kind: "PlaceUnder" }, { kind: "PlaceUnder" }, { kind: "GainMemory", amount: 1, scaling: { unit: "placedCards" } }],
      });
    }
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [expect.anything(), expect.anything(), { trigger: "WhenAttacking", actions: [{ kind: "ModifyDP", amount: 3000, condition: { kind: "selfDigivolutionStackDistinctColorCount", value: 3 } }, { kind: "DeDigivolve", amount: 1, condition: { kind: "selfDigivolutionStackDistinctColorCount", value: 4 } }] }],
    });
  });

  it("places Raijinmon, Fujinmon and Suijinmon from trash under itself and gains three memory", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT9-067", as: "source" }], trash: ["BT9-042", "BT9-054", "BT9-029"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 3);
    const source = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT9-067");
    expect(source?.stack.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT9-042", "BT9-054", "BT9-029"]));
  });
});
