import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-094 Seventh Divine Cruz", () => {
  it("preserves Trash-only Lucemon X Antibody timing, branch recovery, delete-until-security count, and Security play", () => {
    const card = runtimeCompiledCard("BT19-094");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        isFromTrash: true,
        actions: [{
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
        }],
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
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        }],
      },
    ]);
  });
});
