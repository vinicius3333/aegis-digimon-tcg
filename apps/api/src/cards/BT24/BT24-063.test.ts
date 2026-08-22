import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_063 } from "./BT24-063.js";
import "../index.js";

describe("BT24-063 Locomon", () => {
  it("has the same play-from-reveal search on play and digivolving", () => {
    const effects = BT24_063.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      expect((effect.actions?.[0] as any).add?.[0]).toMatchObject({
        count: 1,
        to: "play",
        optional: true,
        filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }] },
      });
    }
  });

  it("plays a cost-5-or-lower TS Tamer from the reveal and returns the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-083", as: "tamer" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("locomon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves from a level-4 TS Digimon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-046", as: "ts" }],
        hand: [{ card: "BT24-063", as: "locomon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ts").permanentId,
        instanceId: s.inst("locomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ts").topCard.instanceId === s.inst("locomon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("exposes Collision both as a main and inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-063", as: "locomon" },
          { card: "BT24-064", as: "host", under: ["BT24-063"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("locomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
  });
});
