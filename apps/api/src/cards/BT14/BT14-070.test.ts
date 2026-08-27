import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-070.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-070", () => {
  it("inherits once-per-turn memory when trashed from hand during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));
  it("gains memory when an effect trashes a card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-070"] }],
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });
});
