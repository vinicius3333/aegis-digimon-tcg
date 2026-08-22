import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-092.js";

describe("BT21-092 Can't Turn My Back!", () => {
  it("encodes stack transfer, counted reduction, color waiver, and Security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        fromSelectedPermanentDigivolutionCards: true,
        order: "any",
        trackCount: "placedXrosSources",
      },
      {
        kind: "PlayWithoutCost",
        payCost: true,
        from: ["hand"],
        reduceCostByScaling: { unit: "namedCount", countSource: "placedXrosSources" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("moves only Digimon source cards under a Tamer and reduces the played card by that count", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-008",
              as: "xrosHost",
              under: [
                { card: "BT1-009", as: "digimonSource" },
                { card: "BT21-083", as: "tamerSource" },
              ],
            },
            { card: "BT21-083", as: "destination" },
          ],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    setup.state.memory = 10;

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    const playedId = setup.inst("playedXros").instanceId;
    await settle(() =>
      setup.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId),
    );

    expect(setup.perm("xrosHost").stack.map((card) => card.instanceId)).toEqual([setup.inst("tamerSource").instanceId]);
    expect(setup.perm("destination").stack.map((card) => card.instanceId)).toContain(
      setup.inst("digimonSource").instanceId,
    );
    // 10 - option cost 2 - (Shoutmon cost 4 - 1 placed Digimon card) = 5.
    expect(setup.state.memory).toBe(5);
  });
});
