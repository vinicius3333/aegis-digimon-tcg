import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-065.js";
import "../index.js";
describe("BT26-065 Falcomon", () => {
  it("compiles both reveal slots with the purple restriction", () => {
    expect(digivolutionRequirementsFor("BT26-065")).toContainEqual({ level: 2, traits: ["DATA SQUAD"], cost: 0, isAlternate: true });
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1 }, { count: 1 }], rest: "deckBottom" });
  });
  it("keeps the inherited draw then hand-trash sequence", () => {
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw" }, { kind: "Trash", optional: false }] });
  });

  it("publicly adds a Keenan and a purple Ravemon from the top three and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-065", as: "falcomon" }],
        deck: [{ card: "BT26-094", as: "keenan" }, { card: "BT13-089", as: "ravemon" }, { card: "BT1-009", as: "rest" }],
      },
    }, { autoSelectCards: true, autoOrderCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT13-089", "BT26-094"]);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });
});
