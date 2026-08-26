import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { permanentMatchesFilter } from "../../engine/effects/interpreter.js";
import { candidateLooseInstances } from "../../engine/effects/interpreter/targeting/loose.js";
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
          digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "trait", negate: true }],
        },
      },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["X Antibody"],
    });
  });
  it("registers the inherited leave-field return and security placement effect", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          leaveCause: "otherThanYourEffect",
          actions: [
            { kind: "Return" },
            {
              kind: "SecurityManipulation",
              source: {
                filter: {
                  nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("excludes own-effect leaves and keeps the first stack return mandatory before security placement", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    if (replacement?.kind !== "Replacement") throw new Error("EX5-070 inherited replacement missing");
    if (replacement.actions === undefined) throw new Error("EX5-070 replacement actions missing");
    expect(replacement.leaveCause).toBe("otherThanYourEffect");
    expect(replacement.actions[0]).toMatchObject({ kind: "Return", to: "hand" });
    expect(replacement.actions[0]).not.toHaveProperty("optional");
    expect(replacement.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "addTop" });
  });

  it("excludes a stack carrying Proto Form itself from the Main evolution target, per Q3679", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "withProto", under: ["EX5-070", "BT1-009"] },
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
        permanent: () => s.perm("withProto"),
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
          [...s.state.players[0]!.battleArea, ...s.state.players[1]!.battleArea].find(
            (permanent) => permanent.permanentId === id,
          ),
        definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId),
        linkMax: () => 1,
      },
      fx: {},
      ask: {},
      selections: new Map(),
    } as any;

    expect(permanentMatchesFilter(ctx, s.perm("withProto"), targetFilter.target.filter, ctx.source)).toBe(false);
    expect(permanentMatchesFilter(ctx, s.perm("withoutProto"), targetFilter.target.filter, ctx.source)).toBe(true);

    const inherited = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    const replacement = inherited.actions.find((action) => action.kind === "Replacement");
    if (replacement?.kind !== "Replacement") throw new Error("EX5-070 inherited replacement missing");
    if (replacement.actions === undefined) throw new Error("EX5-070 replacement actions missing");
    const returnAction = replacement.actions.find((action) => action.kind === "Return")!;
    if (returnAction.kind !== "Return") throw new Error("EX5-070 inherited return missing");

    const returnCandidates = candidateLooseInstances(ctx, returnAction.target, ["digivolutionCards"]);
    expect(returnCandidates.map((candidate) => candidate.hostPermanentId)).toEqual([s.perm("withProto").permanentId]);
    expect(returnCandidates.map((candidate) => candidate.cardId)).toEqual(["BT1-009"]);
  });
});
