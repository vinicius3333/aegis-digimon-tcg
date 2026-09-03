import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-016 Gaossmon", () => {
  it("naturally resolves On Play when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-020", as: "blueFlare" },
          ],
          battleArea: [{ card: "BT19-081", as: "tamer" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaoss").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it.each([EffectTiming.OnPlay, EffectTiming.OnDestroyedAnyone])(
    "%s places a Blue Flare Digimon from hand under a Tamer as the cost to draw 1",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-016", as: "gaoss" },
              { card: "BT19-081", as: "tamer" },
            ],
            hand: [
              { card: "BT19-020", as: "blueFlare" },
              { card: "BT19-009", as: "nonmatching" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      if (timing === EffectTiming.OnPlay) await advance(s.engine).fireForPermanent(timing, s.perm("gaoss"));
      else await advance(s.engine).verb.deletePermanent([s.perm("gaoss").permanentId]);
      await settle(() => s.perm("tamer").stack.length === 1);

      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT19-009", "BT1-009"]),
      );
      expect(s.state.players[0]!.deck).toHaveLength(0);
    },
  );

  it("may decline the placement cost, drawing nothing and moving no card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-016", as: "gaoss" },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: [{ card: "BT19-020", as: "blueFlare" }],
          deck: [{ card: "BT1-009", as: "top" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gaoss"));
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
