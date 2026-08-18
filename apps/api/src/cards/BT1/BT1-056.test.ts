import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-056.js";

describe("BT1-056 Petermon", () => {
  it("plays Tinkermon from trash without paying its memory cost", async () => {
    const s = setupEngine({ 0: {
      hand: [{ card: "BT1-056", as: "petermon" }],
      trash: [{ card: "BT1-047", as: "tinkermon" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const tinkermonId = s.inst("tinkermon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === tinkermonId));

    expect(s.state.memory).toBe(0);
    expect(player.trash).toHaveLength(0);
  });
});
