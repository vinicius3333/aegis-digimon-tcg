import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-061.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-061", () => {
  it("gains one memory on play or digivolution by returning an opponent Digimon from trash to deck top", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        cost: { kind: "return", target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } } },
      });
  });
  it("returns an opponent Digimon to deck top and gains memory", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-061", as: "source" }] }, 1: { trash: [{ card: "BT14-044", as: "returned" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT14-044") && s.state.memory === 6);
    expect(s.state.players[1]!.deck[0]?.cardId).toBe("BT14-044");
    expect(s.state.memory).toBe(7);
  });
});
