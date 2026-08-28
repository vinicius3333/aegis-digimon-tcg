import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST1-01.js";
import "./ST1-03.js";
import "./ST1-07.js";
import "./ST1-11.js";
import "./ST1-12.js";

describe("ST1 WarGreymon historical deck gauntlet", () => {
  it("stacks source-count security attacks, Greymon's inherited check, Koromon, Agumon, and two Tai", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST1-11",
              as: "wargreymon",
              under: ["ST1-01", "ST1-03", "ST1-07", "ST1-08"],
            },
            { card: "ST1-12", as: "firstTai" },
            { card: "ST1-12", as: "secondTai" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    const wargreymon = s.perm("wargreymon");
    const printedDp = getCardDefinition("ST1-11")!.dp;

    expect(wargreymon.currentDP).toBe(printedDp + 4000);
    expect(observe(s.engine).keywordAmount(wargreymon, "SecurityAttack")).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: wargreymon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Four consecutive checks each open their own security/loss timing windows. Wait for the
    // complete attack, rather than asserting against the first visible security mutation.
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 3000);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("rounds three digivolution cards down to one WarGreymon bonus, then stacks Greymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "ST1-11",
            as: "wargreymon",
            under: ["ST1-01", "ST1-03", "ST1-07"],
          },
        ],
      },
    });
    await s.ready();

    // KB Q605: three sources only count as one complete pair for ST1-11. Greymon's
    // inherited Security Attack +1 remains a separate grant, for a total modifier of +2.
    expect(observe(s.engine).keywordAmount(s.perm("wargreymon"), "SecurityAttack")).toBe(2);
  });
});
