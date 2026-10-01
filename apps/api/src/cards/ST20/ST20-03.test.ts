import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-03.js";

describe("ST20-03 Birdramon", () => {
  it("may digivolve for free from hand at exactly three Adventure Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [
            { card: "ST20-03", as: "birdramon" },
            { card: "ST20-09", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("next").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("next").instanceId)).toBe(false);
  });

  it("does not digivolve when Adventure Tamers have fewer than three colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-12", as: "twoColorTamer" }],
          hand: [
            { card: "ST20-03", as: "birdramon" },
            { card: "ST20-09", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("birdramon").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("next").instanceId)).toBe(true);
  });
});

describe("ST20-03 Birdramon — KB Q&A rulings", () => {
  it.each([
    { tamers: ["ST20-12", "ST20-13"], totalColors: 4, digivolves: true },
    { tamers: ["ST20-12", "ST20-12"], totalColors: 2, digivolves: false },
  ])(
    "counts $totalColors total [ADVENTURE] Tamer colors against '3 or more': digivolves $digivolves (Q4444)",
    async ({ tamers, digivolves }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: tamers,
            hand: [
              { card: "ST20-03", as: "birdramon" },
              { card: "ST20-09", as: "next" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((perm) =>
            [s.inst("birdramon").instanceId, s.inst("next").instanceId].includes(perm.topCard?.instanceId ?? ""),
          ) && s.state.pendingDecision === undefined,
      );
      await settle(() => false, 30);
      const birdramon = s.state.players[0]!.battleArea.find((perm) =>
        [perm.topCard, ...perm.stack].some((card) => card.instanceId === s.inst("birdramon").instanceId),
      )!;
      expect(birdramon.topCard.instanceId).toBe(
        digivolves ? s.inst("next").instanceId : s.inst("birdramon").instanceId,
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("next").instanceId)).toBe(!digivolves);
    },
  );
});
