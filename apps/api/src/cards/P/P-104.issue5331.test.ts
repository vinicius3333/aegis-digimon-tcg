import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-104.js";

describe.each([0, 1] as const)("#5331 sweep P-104 own-hand scope, seat %s", (seat) => {
  it.each([false, true])("never consumes opposing blue destination, own legal card=%s", async (ownLegal) => {
    const other = seat === 0 ? 1 : 0;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [
            { card: "P-104", as: "delay" },
            { card: "BT1-029", as: "host" },
          ],
          hand: ownLegal ? [{ card: "BT1-037", as: "own" }] : [],
          deck: ["BT1-029"],
        },
        [other]: { hand: [{ card: "BT1-037", as: "opposing" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = seat;
    s.state.turnCount = 2;
    s.state.memory = 10;
    await s.ready();
    const opposingId = s.inst("opposing").instanceId;
    const expectedId = ownLegal ? s.inst("own").instanceId : s.perm("host").topCard.instanceId;
    const effects = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(seat, {
        type: "activateEffect",
        sourceInstanceId: s.inst("delay").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(ownLegal ? "BT1-037" : "BT1-029");
    expect(s.perm("host").topCard.instanceId).toBe(expectedId);
    expect(s.perm("host").topCard.ownerSeat).toBe(seat);
    expect(s.state.players[other]!.hand.map((card) => card.instanceId)).toEqual([opposingId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(opposingId))).toBe(false);
  });
});
