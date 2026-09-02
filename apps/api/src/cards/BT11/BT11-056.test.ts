import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-056.js";

describe("BT11-056 Jijimon", () => {
  it("maps the green mega and both reveal/play clauses", () => {
    expect(getCardDefinition("BT11-056")).toMatchObject({
      cardId: "BT11-056",
      colors: ["Green"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Ancient"],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckTopOrBottom",
          add: [{ filter: { controllerDefault: "mine", kind: ["Tamer"] } }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "RevealAdd", add: [{ totalPlayCostBudget: 10 }] }],
    });
    expect(compiled.effects[0]?.actions[0]).not.toHaveProperty("add.0.filter.colors");
  });

  it("reveals 3 and plays a revealed Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-055", as: "base" }],
          hand: [{ card: "BT11-056", as: "jijimon" }],
          deck: [
            { card: "BT1-001", as: "digivolveDraw" },
            { card: "BT1-085", as: "tamer" },
            { card: "BT1-064", as: "rest1" },
            { card: "BT1-065", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jijimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]),
    );
  });

  it("Q2090: a dual-color green/black Tamer reveals only one card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-056", as: "jijimon" },
            { card: "BT23-083", as: "dualTamer" },
          ],
          deck: [
            { card: "BT1-064", as: "revealed" },
            { card: "BT1-065", as: "notRevealed" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jijimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("revealed").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notRevealed").instanceId);
  });

  it("Q2089: may play a lower-cost revealed subset instead of filling the budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-056", as: "jijimon" },
            { card: "BT1-088", as: "greenTamer" },
            { card: "BT1-089", as: "secondGreenTamer" },
          ],
          deck: [
            { card: "BT1-081", as: "overBudget" },
            { card: "BT1-064", as: "chosen" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jijimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("chosen").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("overBudget").instanceId);
  });
});
