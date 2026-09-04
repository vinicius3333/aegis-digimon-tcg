import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-002.js";

describe("EX6-002 Yokomon", () => {
  it("inherits a once-per-turn attack cost to place a blue level 3 Digimon from hand under this Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          position: "bottom",
          target: {
            count: 1,
            from: ["hand"],
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] },
            underFilter: { isSelfRef: true },
          },
        },
      ],
    });
  });

  it("places exactly one eligible blue level 3 at the bottom of its host on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-002"] }],
          hand: [
            { card: "BT12-021", as: "blueLevel3" },
            { card: "BT12-021", as: "secondBlueLevel3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(
      () => s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("blueLevel3").instanceId),
      600,
    );

    // EX6-007's own [Your Turn] watcher may draw after the successful placement, so
    // prove the selected card moved rather than asserting an incidental hand size.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("blueLevel3").instanceId);
    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("blueLevel3").instanceId);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT12-021", "EX6-002"]);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondBlueLevel3").instanceId,
    );
  });

  it("may decline and cannot select a non-blue level 3", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-002"] }],
          hand: [{ card: "BT12-021", as: "blueLevel3" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("host"));
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("blueLevel3").instanceId,
    );

    const wrongColor = setupEngine({
      0: {
        battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-002"] }],
        hand: [{ card: "BT1-009", as: "redLevel3" }],
      },
    });
    await advance(wrongColor.engine).fire(EffectTiming.OnUseAttack, wrongColor.perm("host"));
    expect(wrongColor.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      wrongColor.inst("redLevel3").instanceId,
    );
  });
});
