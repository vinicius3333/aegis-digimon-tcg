import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-004.js";

describe("EX6-004 Kokomon", () => {
  it("inherits a once-per-turn effect-suspension trigger that gives one of your Digimon +2000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { kind: ["Digimon"] },
          bySourceController: "mine",
          actions: [
            {
              kind: "ModifyDP",
              amount: 2000,
              duration: "forTheTurn",
              target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            },
          ],
        },
      ],
    });
  });

  it("gains +2000 DP once when one of its controller's effects suspends a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-007", as: "host", under: ["EX6-004"] },
          { card: "BT1-009", as: "subject" },
        ],
      },
    });
    await s.ready();
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.suspend([s.perm("subject").permanentId], 0);
    expect(s.perm("subject").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(before + 2000);
  });
});
