import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../EX1/EX1-005.js";
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

describe("ST4-03 Tentomon — KB Q&A rulings", () => {
  function playTentomonRevealing(topCardId: string) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST4-03", as: "tentomon" }],
          deck: [
            { card: topCardId, as: "revealed" },
            { card: "ST3-12", as: "below" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    return s;
  }

  it("does not add a revealed card that is only treated as green while in play (Q3192)", async () => {
    const tyrannomon = playTentomonRevealing("EX1-005");
    await settle(() => tyrannomon.state.players[0]!.deck.at(-1)?.instanceId === tyrannomon.inst("revealed").instanceId);
    expect(tyrannomon.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      tyrannomon.inst("revealed").instanceId,
    );
    expect(tyrannomon.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["ST3-12", "EX1-005"]);

    const rosemon = playTentomonRevealing("ST4-12");
    await settle(() =>
      rosemon.state.players[0]!.hand.some(({ instanceId }) => instanceId === rosemon.inst("revealed").instanceId),
    );
    expect(rosemon.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["ST3-12"]);
  });
});
