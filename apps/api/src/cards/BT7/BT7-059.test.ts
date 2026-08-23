import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-059.js";

describe("BT7-059 DeadlyAxemon", () => {
  it("adds up to two Knightmon-named cards from five revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-059", as: "source" }],
          deck: [
            { card: "BT7-058", as: "knightA" },
            { card: "BT7-063", as: "knightB" },
            "BT7-056",
            "BT7-057",
            "BT7-060",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("knightA").instanceId, s.inst("knightB").instanceId];
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("may add only one Knightmon even when two are revealed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT7-059", as: "source" }],
        deck: [{ card: "BT7-058", as: "knightA" }, { card: "BT7-063", as: "knightB" }, "BT7-056", "BT7-057", "BT7-060"],
      },
    });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(JSON.parse(choice.payloadJson)).toMatchObject({ min: 0, max: 2 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("knightB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("knightB").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("knightA").instanceId)).toBe(false);
  });

  it("grants +2000 DP only when the host name contains Knightmon or Bagramon", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT7-058", as: "host", under: ["BT7-059"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(matching.perm("host").currentDP).toBe(matching.perm("host").baseDP + 2000);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT7-059"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(other.perm("host").currentDP).toBe(other.perm("host").baseDP);
  });
});
