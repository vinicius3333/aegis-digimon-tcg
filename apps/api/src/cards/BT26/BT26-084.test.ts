import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
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
    expect(compiled.effects.find((effect) => effect.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [
        {
          kind: "Link",
          from: ["trash"],
          payCost: false,
          optional: true,
          recipient: { isSelf: true },
          target: {
            filter: {
              excludeColors: ["White"],
              levelComparison: { op: "lte", value: 4 },
              hasLinkRequirement: true,
              nameOrTrait: [
                { tokens: ["System"], match: "trait" },
                { tokens: ["Seven Code"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" }],
        },
      ],
    });
    expect(irNode(yourTurn.actions[0]!).actions[0]!.add[0]).toMatchObject({
      to: "play",
      costDelta: 3,
      optional: true,
      filter: { kind: ["Digimon", "Option"], nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] },
      orDispositions: [{ filter: { kind: ["Option"] }, to: "useOption" }],
    });
    expect(irNode(yourTurn.actions[0]!).actions[0]!.add).toHaveLength(1);
  });

  it("selects only one Seven Code card when both a Digimon and Option are revealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102" }] }],
          deck: ["BT26-010", "BT26-102", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("copipemon").permanentId });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT26-102")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102")).toBe(false);
  });

  it("uses a revealed Seven Code Option instead of trying to play it as a permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102" }] }],
          deck: ["BT26-102", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("copipemon").permanentId });

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102")).toBe(true);
  });

  it("reveals three linked-trigger cards and plays a revealed Seven Code Digimon for 3 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102", as: "pad" }] }],
          deck: ["BT26-010", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("copipemon").permanentId,
    });

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });
});
