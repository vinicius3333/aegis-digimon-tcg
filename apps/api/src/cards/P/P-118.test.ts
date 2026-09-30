import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-118.js";
import { handCardIds, playRevealing, selectionFloors } from "./qaRulings3.testSupport.js";

describe("P-118 Wormmon", () => {
  it("adds both matching reveal classes and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-118", as: "wormmon" }],
          deck: [
            { card: "BT16-017", as: "multicolor" },
            { card: "P-125", as: "ken" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ken").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ken").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("uses the inherited End of Your Turn effect for a legal DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-036", as: "host", under: ["P-118"] },
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

describe("P-118 Wormmon — KB Q&A rulings", () => {
  it("adds the one match when only a qualifying card or only a [Ken Ichijoji] Tamer is revealed (Q4226)", async () => {
    const onlyMulticolor = await playRevealing("P-118", ["BT21-046", "BT1-070", "BT1-009"]);
    expect(handCardIds(onlyMulticolor)).toEqual(["BT21-046"]);
    assertNoLoudGap(onlyMulticolor);

    const onlyTamer = await playRevealing("P-118", ["P-125", "BT1-070", "BT1-009"]);
    expect(handCardIds(onlyTamer)).toEqual(["P-125"]);
    assertNoLoudGap(onlyTamer);
  });

  it("accepts both a green/blue and a blue/green card as the green or blue card with 2 or more colors (Q4227)", async () => {
    for (const multicolor of ["BT21-046", "BT16-021"]) {
      const s = await playRevealing("P-118", [multicolor, "BT1-070", "BT1-009"]);
      expect(handCardIds(s)).toEqual([multicolor]);
      assertNoLoudGap(s);
    }
  });

  it("must add both cards when both targets are revealed (Q4228)", async () => {
    const s = await playRevealing("P-118", ["BT21-046", "P-125", "BT1-009"]);
    expect(handCardIds(s)).toEqual(["BT21-046", "P-125"].sort());
    expect(selectionFloors(s).every((min) => min === 1)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });
});
