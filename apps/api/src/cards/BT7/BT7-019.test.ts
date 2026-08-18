import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-019.js";

describe("BT7-019 Strabimon", () => {
  it("may play Koji from hand when its host is deleted", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT7-021", under: ["BT7-019"], as: "host" }],
      hand: [{ card: "BT7-087", as: "koji" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("koji").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("koji").instanceId)).toBe(true);
  });

  it("adds an eligible Hybrid, Susanoomon or Koji card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-019", as: "source" }], deck: [
      { card: "BT7-021", as: "hybrid" }, "BT7-020", "BT7-022", "BT7-023",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("hybrid").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
