import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-067.js";

describe("EX4-067 Full Metal Blaze", () => {
  it("returns up to two opposing level four or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 2 } });
  });
  it("returns a level six or higher Digimon to deck bottom when opponent has eight cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({ kind: "Return", to: "deckBottom", condition: { kind: "zoneCount", seat: "opponent", op: "gte", value: 8 }, target: { filter: { levelComparison: { op: "gte", value: 6 } } } });
  });

  it("returns the low-level targets and bottoms a high-level target after reaching eight cards", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX4-067", as: "option" }], battleArea: [{ card: "EX4-014", as: "blue" }] },
      1: {
        hand: Array(7).fill("BT1-001"),
        battleArea: [
          { card: "BT1-010", as: "lowOne" },
          { card: "BT1-011", as: "lowTwo" },
          { card: "EX4-049", as: "high" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.hand).toHaveLength(9);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("EX4-049");
  });
});
