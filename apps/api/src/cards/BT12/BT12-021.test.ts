import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-021.js";

describe("BT12-021 Veemon", () => {
  it("reveals three and must add one Imperialdramon/Free card plus one Davis-name card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-021", as: "veemon" }],
          deck: ["BT12-030", "BT8-088", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-030", "BT8-088"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it.each([
    ["only the Imperialdramon/Free branch", ["BT12-030", "BT1-009", "BT1-010"], "BT12-030"],
    ["only the Davis-name branch", ["BT8-088", "BT1-009", "BT1-010"], "BT8-088"],
  ])("adds the available card when the reveal contains %s", async (_case, deck, expected) => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-021", as: "veemon" }], deck } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === expected));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([expected]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may DNA digivolve its host with another Digimon at end of its turn by paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "blue", under: ["BT12-021"] },
            { card: "BT1-069", as: "green" },
          ],
          hand: [{ card: "BT12-028", as: "paildramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const blueTop = s.perm("blue").topCard.instanceId;
    const greenTop = s.perm("green").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("blue"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-028"));
    const result = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-028")!;
    expect(result.stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining([blueTop, greenTop]));
    expect(s.state.memory).toBe(3);
  });
});
