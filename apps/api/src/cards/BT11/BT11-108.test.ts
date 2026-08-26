import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-108.js";

describe("BT11-108 DG Dimension", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-108")).toMatchObject({ cardId: "BT11-108", colors: ["Black"], kinds: ["Option"], playCost: 8 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      { trigger: "Main", actions: [{ kind: "DeDigivolve", amount: 1 }, { kind: "Trash" }, { kind: "Delete", target: { filter: { playCostLte: 6 } } }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("de-digivolves before evaluating and deleting play-cost-6-or-less Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-092"], hand: [{ card: "BT11-108", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "stacked", under: ["BT1-015"] },
            { card: "BT1-010", as: "small" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-081", "BT1-015", "BT1-010"]),
    );
  });

  it("does not delete an opponent above play cost 6 after De-Digivolve", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-092"], hand: [{ card: "BT11-108", as: "option" }] },
        1: { battleArea: [{ card: "BT1-081", as: "expensive" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("expensive").permanentId)).toBe(true);
  });
});
