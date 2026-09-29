import { describe, it, expect } from "vitest";
import { EffectTiming, type Permanent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine as setup, settle, type EngineSetup as Setup } from "../../engine/testkit/harness.js";
import "./BT6-077.js";

describe("BT6-077 [All Turns] color grant — also treated as black (KB Q1466)", () => {
  function place(): Setup {
    return setup({ 0: { battleArea: [{ card: "BT6-077", dp: 8000, as: "base" }] } });
  }

  function effectiveColors(s: Setup, p: Permanent): string[] {
    return observe(s.engine).effectiveColors(p);
  }

  it("is treated as both Purple (printed) and Black on its OWNER's turn", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 0;

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Purple");
    expect(colors).toContain("Black");
  });

  it("[All Turns] means the grant ALSO holds on the OPPONENT's turn (unlike a [Your Turn] grant)", async () => {
    const s = place();
    const base = s.perm("base");
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    const colors = effectiveColors(s, base);
    expect(colors).toContain("Purple");
    expect(colors).toContain("Black");
  });

  it("may trash a hand card to gain Blocker and Retaliation when digivolving", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT6-074", as: "decoy" },
            { card: "BT6-077", as: "rebellimon" },
          ],
          hand: [{ card: "BT6-068", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rebellimon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Retaliation")).toBe(false);
  });

  it("grants neither keyword when the optional hand-trash condition is declined", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT6-077", as: "rebellimon" }],
          hand: [{ card: "BT6-068", as: "cost" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rebellimon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Retaliation")).toBe(false);
  });
});

describe("BT6-077 Rebellimon — KB Q&A rulings", () => {
  it("cannot gain Blocker and Retaliation when digivolving with an empty hand (Q1467)", async () => {
    async function digivolveIntoRebellimon(extraHand: string[]) {
      const s = setup(
        {
          0: {
            battleArea: [{ card: "BT6-074", as: "base" }],
            hand: [{ card: "BT6-077", as: "rebellimon" }, ...extraHand],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("rebellimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
      await s.engine.recomputeContinuousEffects();
      return s;
    }

    const emptyHand = await digivolveIntoRebellimon([]);
    const rebellimon = emptyHand.perm("base");
    expect(rebellimon.topCard?.cardId).toBe("BT6-077");
    expect(emptyHand.decisions.some(({ req }) => req.sourceCardId === "BT6-077")).toBe(false);
    expect(observe(emptyHand.engine).hasKeyword(rebellimon, "Blocker")).toBe(false);
    expect(observe(emptyHand.engine).hasKeyword(rebellimon, "Retaliation")).toBe(false);

    const oneCardInHand = await digivolveIntoRebellimon(["BT6-068"]);
    expect(oneCardInHand.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT6-068"]);
    expect(observe(oneCardInHand.engine).hasKeyword(oneCardInHand.perm("base"), "Blocker")).toBe(true);
    expect(observe(oneCardInHand.engine).hasKeyword(oneCardInHand.perm("base"), "Retaliation")).toBe(true);
  });
});
