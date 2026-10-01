import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-121.js";
import { handCardIds, playRevealing, selectionFloors } from "./qaRulings3.testSupport.js";
import "../BT8/BT8-042.js";

describe("P-121 Armadillomon", () => {
  it("adds a black/yellow multicolor card and Cody Hida, then bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-121", as: "armadillomon" }],
          deck: [
            { card: "BT11-036", as: "multicolor" },
            { card: "P-128", as: "cody" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cody").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cody").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("uses the inherited End of Your Turn effect for a legal DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["P-121"] },
            { card: "BT1-032", as: "partner" },
          ],
          hand: [{ card: "BT8-042", as: "dna" }],
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

describe("P-121 Armadillomon — KB Q&A rulings", () => {
  it("adds the one match when only a qualifying card or only a [Cody Hida] Tamer is revealed (Q4232)", async () => {
    const onlyMulticolor = await playRevealing("P-121", ["BT13-064", "BT10-031", "BT1-009"]);
    expect(handCardIds(onlyMulticolor)).toEqual(["BT13-064"]);
    assertNoLoudGap(onlyMulticolor);

    const onlyTamer = await playRevealing("P-121", ["P-128", "BT10-031", "BT1-009"]);
    expect(handCardIds(onlyTamer)).toEqual(["P-128"]);
    assertNoLoudGap(onlyTamer);
  });

  it("accepts both a black/yellow and a yellow/black card as the black or yellow card with 2 or more colors (Q4233)", async () => {
    for (const multicolor of ["BT13-064", "BT11-036"]) {
      const s = await playRevealing("P-121", [multicolor, "BT10-031", "BT1-009"]);
      expect(handCardIds(s)).toEqual([multicolor]);
      assertNoLoudGap(s);
    }
  });

  it("must add both cards when both targets are revealed (Q4234)", async () => {
    const s = await playRevealing("P-121", ["BT13-064", "P-128", "BT1-009"]);
    expect(handCardIds(s)).toEqual(["BT13-064", "P-128"].sort());
    expect(selectionFloors(s).every((min) => min === 1)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });
});
