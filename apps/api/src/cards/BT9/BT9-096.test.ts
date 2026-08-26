import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-096.js";
import "./BT9-096.js";

describe("BT9-096 Startling Thunder", () => {
  it("matches catalog values and the Jellymon-gated return and security IR", () => {
    expect(getCardDefinition("BT9-096")).toMatchObject({
      colors: ["Blue"], kinds: ["Option"], playCost: 4,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [
          { kind: "Return", to: "hand", target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } } },
          { kind: "Return", to: "hand", target: { filter: { kind: ["Tamer"] } }, condition: { kind: "anyOf", conditions: [{ kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Jellymon"], match: "name" }] } }, { kind: "youHave", filter: { digivolutionStackNameOrTrait: [{ tokens: ["Jellymon"], match: "nameExact" }] } }] } },
        ] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("returns a level 4 Digimon and a Tamer when exact Jellymon is in a Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-019", under: ["BT9-021"] }],
          hand: [{ card: "BT9-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT9-020", as: "digimon" },
            { card: "BT10-088", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 2);

    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT9-020", "BT10-088"]),
    );
  });

  it("does not treat an unrelated top-card name as Jellymon in the sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-019" }],
          hand: [{ card: "BT9-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT9-020", as: "digimon" },
            { card: "BT10-088", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT9-020"));

    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT10-088")).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-088")).toBe(true);
  });
});
