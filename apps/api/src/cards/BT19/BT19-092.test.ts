import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-092 Wadatsumi Purification", () => {
  it("returns an opposing Digimon through a public Option play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-092", as: "option" }], battleArea: [{ card: "BT19-024", as: "blue" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

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
