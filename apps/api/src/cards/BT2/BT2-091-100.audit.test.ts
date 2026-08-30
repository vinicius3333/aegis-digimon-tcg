import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-091.js";
import "./BT2-092.js";
import "./BT2-093.js";
import "./BT2-094.js";
import "./BT2-095.js";
import "./BT2-096.js";
import "./BT2-097.js";
import "./BT2-098.js";
import "./BT2-099.js";
import "./BT2-100.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-091 through BT2-100 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT2-091",
      "BT2-092",
      "BT2-093",
      "BT2-094",
      "BT2-095",
      "BT2-096",
      "BT2-097",
      "BT2-098",
      "BT2-099",
      "BT2-100",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed targets, branches, source handling, scaling, and security clauses", () => {
    expect(card("BT2-091")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 } },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);

    expect(card("BT2-092")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2, upTo: true },
            keyword: { keyword: "SecurityAttack", amount: 1 },
            duration: "forTheTurn",
          },
        ],
      },
    ]);

    expect(card("BT2-093")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
            condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red"] } },
          },
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
            condition: { kind: "youHaveNone", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red"] } },
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);

    expect(card("BT2-094")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
            amount: 1,
            choose: true,
          },
          { kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, amount: 2000, duration: "forTheTurn" },
        ],
      },
      { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
    ]);

    expect(card("BT2-095")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 3, upTo: true }, to: "hand" },
        ],
      },
    ]);

    expect(card("BT2-096")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 }, to: "hand" },
          {
            kind: "Unsuspend",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] } },
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);

    expect(card("BT2-097")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 3 }, amount: -4000, duration: "forTheTurn" },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);

    expect(card("BT2-098")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Draw", controller: "mine", amount: 1 },
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -1000,
            duration: "forTheTurn",
            scaling: { per: 1, filter: { zone: "hand", controller: "mine" }, unit: "cards" },
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);

    expect(card("BT2-099")?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 1,
            scaling: { per: 1, filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, unit: "cards" },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -12000, duration: "forTheTurn" }],
      },
    ]);

    expect(card("BT2-100")?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          { kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, amount: 2000, duration: "forTheTurn" },
        ],
      },
    ]);
  });
});
