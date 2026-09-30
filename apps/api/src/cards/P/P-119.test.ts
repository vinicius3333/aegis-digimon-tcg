import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-119.js";
import { handCardIds, playRevealing, selectionFloors } from "./qaRulings3.testSupport.js";

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

describe("P-119 Hawkmon — KB Q&A rulings", () => {
  it("adds the one match when only a qualifying card or only a [Yolei Inoue] Tamer is revealed (Q4229)", async () => {
    const onlyMulticolor = await playRevealing("P-119", ["BT13-008", "BT1-010", "BT1-009"]);
    expect(handCardIds(onlyMulticolor)).toEqual(["BT13-008"]);
    assertNoLoudGap(onlyMulticolor);

    const onlyTamer = await playRevealing("P-119", ["P-126", "BT1-010", "BT1-009"]);
    expect(handCardIds(onlyTamer)).toEqual(["P-126"]);
    assertNoLoudGap(onlyTamer);
  });

  it("accepts both a red/yellow and a yellow/red card as the red or yellow card with 2 or more colors (Q4230)", async () => {
    for (const multicolor of ["BT13-008", "BT12-034"]) {
      const s = await playRevealing("P-119", [multicolor, "BT1-010", "BT1-009"]);
      expect(handCardIds(s)).toEqual([multicolor]);
      assertNoLoudGap(s);
    }
  });

  it("must add both cards when both targets are revealed (Q4231)", async () => {
    const s = await playRevealing("P-119", ["BT13-008", "P-126", "BT1-009"]);
    expect(handCardIds(s)).toEqual(["BT13-008", "P-126"].sort());
    expect(selectionFloors(s).every((min) => min === 1)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });
});
