import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-091.js";

describe("BT18-091 J.P. Shibayama", () => {
  it("covers the paid Hybrid draw and inherited attack-target-switch watcher", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { kind: ["Tamer"], hasInheritedEffects: true } },
            },
          ],
        },
      ],
    });
  });

  it("plays from Security without cost through the real security timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-091", as: "jp", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("jp"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("jp").instanceId)).toBe(
      true,
    );
  });
});
