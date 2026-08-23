import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-066.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-066", () => {
  it("gains two memory on play or digivolution by trashing a Numemon from hand", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 2,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } },
        },
      });
  });
  it("plays a level-five-or-lower Numemon or Monzaemon from hand on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      target: { filter: { levelComparison: { op: "lte", value: 5 } } },
    }));
  it("trashes a Numemon from hand and gains two memory when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-066", as: "source" },
            { card: "BT14-058", as: "numemon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
