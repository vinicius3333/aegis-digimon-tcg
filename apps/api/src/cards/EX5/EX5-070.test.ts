import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { permanentMatchesFilter } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-070.js";
import "./EX5-070.js";

describe("EX5-070 X Antibody Proto Form", () => {
  it("registers static color waiver, security return, and Main X Antibody evolution effects", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]?.kind).toBe(
      "WaiveColorRequirement",
    );
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]?.kind).toBe("AddToHandSelf");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]?.kind).toBe("Digivolve");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      target: {
        filter: {
          digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "name", negate: true }],
        },
      },
    });
  });
  it("registers the inherited leave-field return and security placement effect", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          actions: [
            {
              kind: "SecurityManipulation",
              source: {
                filter: {
                  nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("excludes a stack carrying Proto Form itself from the Main evolution target, per Q3679", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "withProto", under: ["EX5-070"] },
          { card: "BT1-010", as: "withoutProto", under: ["BT1-011"] },
        ],
      },
    });
    await s.ready();
    const targetFilter = compiled.effects
      .find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "Digivolve");
    expect(targetFilter).toMatchObject({ kind: "Digivolve" });
    if (targetFilter?.kind !== "Digivolve") throw new Error("EX5-070 Main Digivolve action missing");

    const ctx = {
      source: {
        instanceId: "EX5-070-source",
        cardId: "EX5-070",
        ownerSeat: 0,
        definition: requireCardDefinition("EX5-070"),
        permanent: () => undefined,
        isOnBattleArea: () => false,
        isOwnersTurn: () => true,
        hasColor: () => false,
      },
      trigger: {},
      game: {
        state: s.state,
        player: (seat: 0 | 1) => s.state.players[seat]!,
        opponentOf: (seat: 0 | 1) => (seat === 0 ? 1 : 0),
        permanentById: (id: string) =>
          [...s.state.players[0]!.battleArea, ...s.state.players[1]!.battleArea].find((permanent) => permanent.permanentId === id),
        definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId),
        linkMax: () => 1,
      },
      fx: {},
      ask: {},
      selections: new Map(),
    } as never;

    expect(permanentMatchesFilter(ctx, s.perm("withProto"), targetFilter.target.filter, ctx.source)).toBe(false);
    expect(permanentMatchesFilter(ctx, s.perm("withoutProto"), targetFilter.target.filter, ctx.source)).toBe(true);
  });
});
