import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-047.js";

describe("EX8-047", () => {
  it("reveals 3 for Mineral/Rock and LIBERATOR cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("gains Mineral as a rule trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Mineral"],
    });
  });
  it("reveals three cards, adds Mineral and LIBERATOR matches, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-047", as: "source" }],
          deck: [
            { card: "EX8-048", as: "mineral" },
            { card: "EX8-065", as: "liberator" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId) &&
        player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId),
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(player.deck.at(-1)?.instanceId).toBe(s.inst("rest").instanceId);
  });
});
