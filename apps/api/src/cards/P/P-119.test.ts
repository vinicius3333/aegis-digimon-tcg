import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-119.js";

describe("P-119 Hawkmon", () => {
  it("adds a red/yellow multicolor card and Yolei Inoue, then bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-119", as: "hawkmon" }],
          deck: [
            { card: "BT11-009", as: "multicolor" },
            { card: "P-126", as: "yolei" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("uses the inherited End of Your Turn effect for a legal DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          // A DNA digivolve needs a matching printed recipe: BT12-028 Paildramon prints
          // [DNA Digivolve] Blue Lv.4 + Green Lv.4 for cost 0, so the host (the self material)
          // is a blue level 4 and the partner a green level 4.
          battleArea: [
            { card: "BT1-036", as: "host", under: ["P-119"] },
            { card: "BT1-070", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dna").instanceId));
    const dna = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("dna").instanceId);
    expect(dna).toBeDefined();
    expect(dna!.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("host").instanceId, s.inst("partner").instanceId]),
    );
    assertNoLoudGap(s);
  });
});
