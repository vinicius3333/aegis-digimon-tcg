import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-067.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-067", () => {
  it("reveals three opponent cards, chooses a Digimon budget, deletes up to that total, and returns the reveal", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "RevealChooseDeleteBudget", revealCount: 3, revealController: "opponent", chooseFilter: { kind: ["Digimon"] }, upTo: true, returnRevealed: "deckTopOrBottom", returnOrder: "controllerChoice" });
  });
  it("uses the chosen revealed Digimon play cost as the deletion budget", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT14-067", as: "source" }] },
      1: { deck: ["BT14-039", "BT14-001", "BT1-001"], battleArea: [{ card: "BT14-058", as: "cheap" }, { card: "BT14-039", as: "expensive" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT14-058"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-039")).toBe(true);
  });
});
