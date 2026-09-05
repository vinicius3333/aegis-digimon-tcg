import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST1-01.js";
import "./ST1-03.js";
import "./ST1-07.js";
import "./ST1-09.js";
import "./ST1-11.js";
import "./ST1-12.js";

describe("ST1 WarGreymon historical deck gauntlet", () => {
  it("builds the red evolution line and activates inherited effects as each source moves under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-03", as: "host", under: ["ST1-01"] }],
        hand: [
          { card: "ST1-07", as: "greymon" },
          { card: "ST1-09", as: "metalgreymon" },
          { card: "ST1-11", as: "wargreymon" },
        ],
        deck: ["ST1-02", "ST1-04", "ST1-05", "ST1-10"],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
    });
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("host");
    expect(host.currentDP).toBe(2000);

    for (const [alias, expectedDP, expectedMemory, expectedChecks] of [
      ["greymon", 5000, 8, 0],
      ["metalgreymon", 8000, 5, 1],
      ["wargreymon", 14000, 1, 3],
    ] as const) {
      const instance = s.inst(alias);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: instance.instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => host.topCard.instanceId === instance.instanceId);
      expect(host.currentDP).toBe(expectedDP);
      expect(s.state.memory).toBe(expectedMemory);
      expect(observe(s.engine).keywordAmount(host, "SecurityAttack")).toBe(expectedChecks);
    }
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["ST1-01", "ST1-03", "ST1-07", "ST1-09"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["ST1-02", "ST1-04", "ST1-05"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 3000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

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
