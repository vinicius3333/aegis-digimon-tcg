import { describe, expect, it } from "vitest";
import { observe } from "../testkit/observe.js";
import { internalsOf } from "../testkit/internals.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("acquired placement watchers at relocation seams", () => {
  it("installs BT7-056 after singular relocation before the add event", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-056", as: "source" },
          { card: "BT1-009", as: "dest" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const additions = await observe(s.engine).captureSubTriggers(async () => {
      internalsOf(s.engine).primitives.enterEffectResolution?.(0, ["Digimon"]);
      await internalsOf(s.engine).primitives.relocatePermanentByEffect?.(
        s.perm("dest").permanentId,
        s.perm("source").permanentId,
        { belowTop: false, shedOwnCards: true },
      );
      internalsOf(s.engine).primitives.leaveEffectResolution?.();
    });
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("dest").stack.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(additions).toEqual([
      expect.objectContaining({
        event: "onAddDigivolutionCards",
        payload: expect.objectContaining({
          subjectPermanentId: s.perm("dest").permanentId,
          addedDigivolutionCardInstanceIds: [s.inst("source").instanceId],
          addedDigivolutionCardsPosition: "bottom",
          byEffectSeat: 0,
        }),
      }),
    ]);
    assertNoLoudGap(s);
  });

  it("fires an acquired BT7-056 watcher once for a batch relocation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-056", as: "sourceA" },
          { card: "BT1-010", as: "sourceB" },
          { card: "BT1-009", as: "dest" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const memoryBeforeAdditions: number[] = [];
    const additions = await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.relocatePermanentsByEffect?.(
          s.perm("dest").permanentId,
          [s.perm("sourceA").permanentId, s.perm("sourceB").permanentId],
          { belowTop: false, shedOwnCards: true },
        );
        await settle();
      },
      (event) => {
        if (event === "onAddDigivolutionCards") memoryBeforeAdditions.push(s.state.memory);
      },
    );
    expect(memoryBeforeAdditions).toEqual([0, 1]);
    expect(s.state.memory).toBe(1);
    expect(additions.filter((event) => event.event === "onAddDigivolutionCards")).toHaveLength(2);
    expect(s.perm("dest").stack.map((card) => card.instanceId)).toEqual([
      s.inst("sourceB").instanceId,
      s.inst("sourceA").instanceId,
    ]);
    assertNoLoudGap(s);
  });
});
