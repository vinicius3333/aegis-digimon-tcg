import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-014.js";
import "../index.js";

describe("EX11-014 Penguinmon", () => {
  it("adds Suzune and an Ice-Snow Digimon from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-014", as: "penguinmon" }],
          deck: ["EX11-057", "BT1-032", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-057"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX11-057", "BT1-032"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
