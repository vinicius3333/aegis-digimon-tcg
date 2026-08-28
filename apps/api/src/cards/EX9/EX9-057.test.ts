import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-057.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-057", () => {
  it("moves from breeding to battle when an opponent attacks by returning four exact named Negamon from trash or stacks to the bottom of the Digi-Egg deck", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isBreeding: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "MovePermanent",
              direction: "toBattle",
              cost: {
                kind: "return",
                target: {
                  count: 4,
                  filter: {
                    zone: ["trash", "digivolutionCards"],
                    controller: "mine",
                    kind: ["Digimon", "DigiEgg"],
                    nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    }));
  it("gains Collision, Piercing, and Security A. +1", () =>
    expect(
      compiled.effects
        ?.filter((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))
        .flatMap((entry) => entry.actions.map((action) => (action as any).keyword?.keyword)),
    ).toEqual(expect.arrayContaining(["Collision", "Piercing", "SecurityAttack"])));
  it("places three level-six-or-lower Negamon-text Digimon from trash underneath during digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "place", target: { count: 3 }, position: "top" },
    }));
  it("shares the exact three-card top-stack cost across moving, digivolving, and attacking", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
        cost: {
          target: {
            count: 3,
            from: ["trash"],
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
            },
          },
          destination: "digivolutionStack",
          position: "top",
          host: "self",
        },
      });
  });
  it("returns four named Negamon cards and moves from breeding when an opponent attacks", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "EX9-057", as: "source" }, trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005"] },
        1: { battleArea: [{ card: "EX9-050", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-057"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-057")).toBe(true);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId).slice(-4)).toEqual([
      "EX9-005",
      "EX9-005",
      "EX9-005",
      "EX9-005",
    ]);
  });

  it("does not move from breeding when the four cards only mention Negamon", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "EX9-057", as: "source" }, trash: ["EX9-047", "EX9-048", "EX9-054", "EX9-055"] },
        1: { battleArea: [{ card: "EX9-050", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX9-057");
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
  });
});
