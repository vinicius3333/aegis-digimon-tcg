import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-01.js";
import "./ST3-04.js";
import "./ST3-05.js";
import "./ST3-08.js";
import "./ST3-11.js";

describe("ST3 Seraphimon DP-control deck gauntlet", () => {
  it("combines two reductions into a rule deletion, resolves both inherited rewards, and cancels battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST3-11",
              as: "seraphimon",
              under: ["ST3-01", "ST3-04", "ST3-05", "ST3-08"],
            },
          ],
          security: ["ST3-02", "ST3-03", "ST3-06", "ST3-07"],
        },
        1: {
          battleArea: [
            { card: "ST1-06", as: "fiveThousandDpTarget", suspended: true },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const attacker = s.perm("seraphimon");
    const targetId = s.perm("fiveThousandDpTarget").permanentId;
    const printedDp = getCardDefinition("ST3-11")!.dp;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: targetId },
    })).toEqual({ ok: true });

    // ST3-11 (-4000) plus ST3-08 (-1000) delete the 5000-DP target by the rules. Q635/Q638
    // require the attack to end without becoming a security attack, while ST3-01 and ST3-04
    // still see the 0-DP deletion and ST3-05 still rewards the attack declaration.
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.memory === 2,
      3000,
    );

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toContainEqual(
      expect.objectContaining({ cardId: "ST1-06" }),
    );
    expect(attacker.currentDP).toBe(printedDp + 1000);
    expect(attacker.isSuspended).toBe(true);
  });
});
