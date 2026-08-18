import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-046.js";

describe("BT10-046 Palmon", () => {
  it("adds a Vegetation and a Fairy card from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT10-043", as: "vegetation" }, { card: "BT10-056", as: "fairy" }, "BT10-044", "BT10-045"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("vegetation").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("fairy").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("accepts Carnivorous Plant for Q1971 and must also add the Fairy card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT1-071", as: "plant" }, { card: "BT10-056", as: "fairy" }, "BT10-044", "BT10-045"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 2);

    expect(new Set(s.state.players[0]!.hand.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("plant").instanceId, s.inst("fairy").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("adds the only eligible category card and bottoms the other three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT1-071", as: "plant" }, "BT10-044", "BT10-045", "BT10-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("plant").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    assertNoLoudGap(s);
  });
});
