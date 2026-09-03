import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-094 Seventh Divine Cruz", () => {
  it("deletes down to the security count through a public Option play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-094", as: "option" }],
          security: 1,
          battleArea: [{ card: "BT19-040" }, { card: "BT19-067" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("preserves Trash-only Lucemon X Antibody timing, branch recovery, delete-until-security count, and Security play", () => {
    const card = runtimeCompiledCard("BT19-094");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        isFromTrash: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            sourceFilter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Lucemon (X Antibody)"], match: "name" }],
            },
            actions: [
              {
                kind: "SecurityManipulation",
                op: "trashTop",
                controller: "opponent",
                optionalFor: "opponent",
                amount: 1,
                bindResultAs: "opponentSecurityTrashedBySeventh",
                cost: {
                  kind: "return",
                  target: {
                    filter: { zone: "trash", controller: "mine", isSelfRef: true },
                    count: 1,
                    isSelf: true,
                  },
                },
              },
              {
                kind: "SecurityManipulation",
                op: "addTop",
                controller: "mine",
                source: "deck",
                amount: 1,
                condition: { kind: "bindingEmpty", ref: "opponentSecurityTrashedBySeventh" },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "DeleteUntilCount",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
            untilCountSource: "mineSecurityCount",
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "ifThisEffectActed" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});
