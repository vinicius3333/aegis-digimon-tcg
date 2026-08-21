import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-068 Shademon", () => {
  it("preserves reveal filtering, deletion revival then Save, Composite rule trait, and DigiXros", () => {
    const card = runtimeCompiledCard("BT19-068");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Nene Amano"] }], count: 2 },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{
          kind: "RevealAdd",
          revealCount: 3,
          add: [{
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Twilight", "Composite"], match: "trait" }],
            },
            count: 1,
            to: "hand",
          }],
          rest: "trash",
        }],
      },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Nene Amano"], match: "name" }],
              },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          },
        ],
      },
      {
        trigger: "Rule",
        actions: [{
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Composite"],
        }],
      },
    ]);
  });
});
