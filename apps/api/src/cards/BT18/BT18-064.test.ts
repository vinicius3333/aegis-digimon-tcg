import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-064.js";
import "./index.js";

describe("BT18-064 Mercurymon", () => {
  it("prevents opponent effects from returning itself to hand or deck after play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
    ]);
    const s = setupEngine({ 0: { hand: [{ card: "BT18-064", as: "mercurymon" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercurymon").instanceId })).toEqual({
      ok: true,
    });
    const mercurymon = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-064")!;
    await settle(() => observe(s.engine).isRestricted(mercurymon(), "beReturned"));

    expect(observe(s.engine).isRestricted(mercurymon(), "beReturned")).toBe(true);
    s.state.turnSeat = 1;
    const instanceId = mercurymon().topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([instanceId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instanceId)).toBe(true);
    await advance(s.engine).verb.returnToDeck([instanceId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instanceId)).toBe(true);
    s.state.turnSeat = 0;
    await advance(s.engine).verb.returnToHand([instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId: id }) => id === instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from Sephirothmon for zero, draws, and retains the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-066", as: "sephirothmon" }],
        hand: [{ card: "BT18-064", as: "mercurymon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephirothmon").permanentId,
        instanceId: s.inst("mercurymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sephirothmon").topCard.cardId === "BT18-064");
    expect(s.state.memory).toBe(3);
    expect(s.perm("sephirothmon").stack.map(({ cardId }) => cardId)).toContain("BT18-066");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(observe(s.engine).isRestricted(s.perm("sephirothmon"), "beReturned")).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants inherited +2000 DP only to its host on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-064"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
