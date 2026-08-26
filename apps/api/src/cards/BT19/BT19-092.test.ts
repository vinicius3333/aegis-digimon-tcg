import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-092 Wadatsumi Purification", () => {
  it("requires any blue Digimon for the upgraded return and falls back to level 4", () => {
    const card = runtimeCompiledCard("BT19-092");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 6 },
              },
              count: 1,
            },
            to: "deckBottom",
            bindResultAs: "upgraded",
            cost: {
              kind: "return",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                },
                count: 1,
              },
            },
            optional: true,
            abortOnDecline: false,
          },
          {
            kind: "Return",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
              },
              count: 1,
            },
            to: "deckBottom",
            condition: { kind: "bindingEmpty", ref: "upgraded" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "ActivateMain" }],
      },
    ]);
  });
});
