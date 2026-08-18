import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-03.js";
import "./ST7-09.js";
import "./ST7-12.js";

describe("ST7 mixed Gallantmon line", () => {
  it("draws only once when Atomic Blaster deletes several opposing Digimon together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-09", as: "gallantmon", under: ["ST7-03"] }],
          hand: [{ card: "ST7-12", as: "atomicBlaster" }],
          deck: [
            { card: "ST7-02", as: "firstDraw" },
            { card: "ST7-02", as: "secondDraw" },
          ],
        },
        1: {
          battleArea: [
            { card: "ST7-04", as: "threeThousand", dp: 3_000 },
            { card: "ST7-05", as: "fourThousand", dp: 4_000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("atomicBlaster").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("secondDraw").instanceId]);
    assertNoLoudGap(s);
  });
});
