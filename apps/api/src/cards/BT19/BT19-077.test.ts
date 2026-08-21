import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-077 Calumon", () => {
  it("preserves Security play, suspend-paid hand Digivolve, attack/block restriction, and top-security return", () => {
    const card = runtimeCompiledCard("BT19-077");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Security",
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 2000 } },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        }],
      },
      {
        trigger: "Main",
        actions: [{
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"] },
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
          abortOnDecline: true,
        }],
      },
      {
        trigger: "AllTurns",
        actions: [{
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "attackOrBlock",
          duration: "permanent",
        }],
      },
      {
        trigger: "OnDeletion",
        actions: [{
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          toTop: true,
        }],
      },
    ]);
  });
});
