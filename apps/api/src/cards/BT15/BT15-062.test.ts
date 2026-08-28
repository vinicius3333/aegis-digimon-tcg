import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-062.js";

describe("BT15-062", () => {
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("deletes the paid Digimon and plays the Dark Masters into an empty breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-055", as: "victim" }, { card: "BT15-062", as: "gigadramon" }],
        hand: [{ card: "BT15-066", as: "machinedramon" }],
      },
      1: { deck: ["BT15-055"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-066");
    await turn;

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-066");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT15-055");
  });
});
