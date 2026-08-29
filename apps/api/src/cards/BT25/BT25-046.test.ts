import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_046 } from "./BT25-046.js";
import "../index.js";

describe("BT25-046 Gekkomon", () => {
  it("reveals three and adds Glowing Dawn plus green BEATBREAK", () => {
    const effect = BT25_046.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((effect?.actions?.[0] as { add?: unknown }).add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          colors: ["Green"],
          nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }],
        },
      }),
    ]);
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: [
            { card: "BT25-041", as: "glowing" },
            { card: "BT25-046", as: "beatbreak" },
            { card: "BT1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("glowing").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("beatbreak").instanceId),
    );

    expect(s.state.players[0]!.hand).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: s.inst("glowing").instanceId }),
        expect.objectContaining({ instanceId: s.inst("beatbreak").instanceId }),
      ]),
    );
    expect(s.state.players[0]!.deck).toEqual([expect.objectContaining({ instanceId: s.inst("rest").instanceId })]);
  });
});
