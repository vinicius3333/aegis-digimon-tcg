import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-084.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-084 compiled behavior", () => {
  it("proves Appmon evolution/link, Detach, once-per-turn linked reveal, and Digimon play branch", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.keywords).toEqual([{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }]);
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" }] }] });
    expect(yourTurn.actions[0].actions[0].add[0]).toMatchObject({ to: "play", costDelta: 3, optional: true, filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] } });
    expect(yourTurn.actions[0].actions[0].add[1]).toMatchObject({ to: "useOption", costDelta: 3, optional: true, filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] } });
  });

  it("links one non-white level-four-or-lower System or Seven Code card from trash", () => {
    const linked = compiled.effects.find((effect) => effect.isLinked)!;
    expect(linked.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Link", from: ["trash"], payCost: false, optional: true, recipient: { isSelf: true }, target: { count: 1, filter: { zone: "trash", levelComparison: { op: "lte", value: 4 }, nameOrTrait: [
      { tokens: ["System"], match: "trait" },
      { tokens: ["Seven Code"], match: "trait" },
    ] } } }] });
  });

  it("reveals three linked-trigger cards and plays a revealed Seven Code Digimon for 3 less", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102", as: "pad" }] }],
        deck: ["BT26-010", "BT1-001", "BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("copipemon").permanentId,
    });

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });
});
