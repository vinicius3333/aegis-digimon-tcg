import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_058 } from "./BT24-058.js";
import "../index.js";

describe("BT24-058 Blimpmon", () => {
  it("searches the two printed destination branches on play and digivolving", () => {
    const effects = BT24_058.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const reveal = effect.actions?.[0] as any;
      expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      // One add entry offers both printed destinations: `to` is the default and `orDispositions`
      // carries the alternative, which is the pair runRevealAdd presents as one choice.
      expect(reveal.add).toHaveLength(1);
      expect(reveal.add[0]).toMatchObject({
        to: "hand",
        orDispositions: [expect.objectContaining({ to: "placeUnder" })],
      });
    }
    expect(BT24_058.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Reboot");
  });

  it("adds an eligible Tamer to hand and returns the other cards to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-058", as: "blimpmon" }],
          deck: [
            { card: "P-133", as: "tamer" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("blimpmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may place the selected eligible card under a Machine Digimon instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-058", as: "blimpmon" }],
          deck: [
            { card: "P-133", as: "tamer" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("blimpmon"));

    expect(s.perm("blimpmon").stack.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("digivolves from a level-3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-043", as: "ts" }],
        hand: [{ card: "BT24-058", as: "blimpmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ts").permanentId,
        instanceId: s.inst("blimpmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ts").topCard.instanceId === s.inst("blimpmon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("grants inherited Reboot to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-059", as: "host", under: ["BT24-058"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
