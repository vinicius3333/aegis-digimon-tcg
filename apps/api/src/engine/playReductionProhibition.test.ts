import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT8/BT8-071.js";
import "../cards/BT9/BT9-097.js";
import "../cards/BT9/BT9-109.js";

describe("automatic Option reduction under a prohibition", () => {
  it.each([false, true])("Psychemon present: %s", async (blocked) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "host" }],
          hand: [
            { card: "BT9-109", as: "x" },
            { card: "BT9-097", as: "metalStorm" },
          ],
        },
        1: { battleArea: blocked ? [{ card: "BT8-071", as: "psychemon" }] : [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 7;
    await s.ready();
    const xId = s.inst("x").instanceId;
    const optionId = s.inst("metalStorm").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: xId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === xId));
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([xId]);
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(blocked ? 0 : 2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
