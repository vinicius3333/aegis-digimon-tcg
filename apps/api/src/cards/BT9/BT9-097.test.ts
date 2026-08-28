import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-097.js";
import "./BT9-097.js";

describe("BT9-097 Metal Storm", () => {
  it("matches catalog values and exact-source reduction, return, and security IR", () => {
    expect(getCardDefinition("BT9-097")).toMatchObject({
      colors: ["Blue"], kinds: ["Option"], playCost: 7,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        {
          trigger: "Static",
          actions: [{
            kind: "Replacement", event: "wouldBePlayed",
            actions: [{
              kind: "Replacement", mode: "reduceCost", amount: 2,
              condition: { kind: "youHave", filter: { digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] } },
            }],
          }],
        },
        {
          trigger: "Main",
          actions: [
            { kind: "Return", to: "hand", target: { filter: { levelComparison: { op: "lte", value: 6 } } } },
            { kind: "Unsuspend", target: { filter: { nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }] } } },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("returns an opposing level 6 or lower Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-019"], hand: [{ card: "BT9-097", as: "option" }] }, 1: { battleArea: ["BT9-020"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020")).toBe(true);
  });

  it("does not reduce its cost for a top-card X-Antibody-form name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-019", as: "host", under: ["BT9-024"] }],
        hand: [{ card: "BT9-097", as: "option" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(-2);
  });

  it("reduces its cost for the exact X Antibody Option in a Digimon's sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-019", as: "host", under: ["BT9-109"] }],
        hand: [{ card: "BT9-097", as: "option" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
