import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-067.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-067", () => {
  it("reveals three opponent cards, chooses a Digimon budget, deletes up to that total, and returns the reveal", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealChooseDeleteBudget",
        revealCount: 3,
        revealController: "opponent",
        chooseFilter: { kind: ["Digimon"] },
        upTo: true,
        returnRevealed: "deckTopOrBottom",
        returnOrder: "controllerChoice",
      });
  });
  it("uses the chosen revealed Digimon play cost as the deletion budget", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-067", as: "source" }] },
        1: {
          deck: ["BT14-039", "BT14-082", "BT14-089"],
          battleArea: [
            { card: "BT14-058", as: "cheap" },
            { card: "BT14-039", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT14-058"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-039")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-039", "BT14-082", "BT14-089"]);
  });

  it("naturally resolves the When Digivolving budget from a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-064", as: "base" }],
          hand: [{ card: "BT14-067", as: "evolving" }],
        },
        1: {
          deck: ["BT14-039", "BT14-082", "BT14-089"],
          battleArea: [{ card: "BT14-058", as: "cheap" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT14-058"));

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-067");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-039", "BT14-082", "BT14-089"]);
  });
});
