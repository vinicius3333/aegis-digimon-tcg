import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST4-03.js";

describe("ST4-03 Tentomon", () => {
  it("adds a revealed green Digimon to hand", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST4-03", as: "tentomon" }], deck: [{ card: "ST4-12", as: "found" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("found").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("returns a revealed non-green card to the bottom of the deck", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST4-03", as: "tentomon" }],
        deck: [
          { card: "ST3-12", as: "invalid" },
          { card: "ST4-12", as: "bottomBefore" },
        ],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === s.inst("invalid").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("invalid").instanceId);
  });
});
