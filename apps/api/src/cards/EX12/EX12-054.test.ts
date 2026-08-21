import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-054.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX12-054 Guardromon", () => {
  it("keeps Blocker on the card and as an inherited effect", () => {
    const staticEffects = compiled.effects.filter((effect) => effect.trigger === "Static");

    expect(staticEffects).toHaveLength(2);
    expect(staticEffects.every((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Blocker"))).toBe(
      true,
    );
    expect(staticEffects[1]?.isInherited).toBe(true);
  });

  it("requires the Machine/Cyborg/ME hand trash before drawing on play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "ME"] }],
          },
          count: 1,
        },
      },
    });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("uses the same mandatory cost on digivolving", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];

    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("retains the alternate ME level-3 evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ME"], cost: 2, isAlternate: true }]);
  });

  it("trashes a Machine card before drawing two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-054", as: "guardromon" },
            { card: "EX12-053", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    const player = s.state.players[0]!;
    expect(player.trash.map((card) => card.cardId)).toContain("EX12-053");
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("uses the same mandatory trash-and-draw sequence when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-053", as: "host" }],
          hand: [
            { card: "EX12-054", as: "guardromon" },
            { card: "EX12-053", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    const player = s.state.players[0]!;
    expect(s.perm("host").topCard.cardId).toBe("EX12-054");
    expect(player.trash.map((card) => card.cardId)).toContain("EX12-053");
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });
});
