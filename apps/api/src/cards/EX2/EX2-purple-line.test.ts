import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-039.js";
import "./EX2-042.js";
import "./EX2-043.js";
import "./EX2-044.js";

describe("EX2 mixed Beelzemon line", () => {
  it("combines Impmon and Mephistomon inherited effects with Beelzemon's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-044",
              as: "beelzemon",
              under: ["EX2-039", "EX2-042"],
            },
          ],
          hand: [{ card: "BT1-001", as: "discard" }],
          deck: ["BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [{ card: "EX2-008", as: "levelThree" }],
          security: ["BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await settle(() => s.perm("beelzemon").currentDP === 14_000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 4 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId),
    );

    expect(s.perm("beelzemon").currentDP).toBe(14_000);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not give Impmon's inherited DP bonus to a non-Beelzemon host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-043", as: "gulfmon", under: ["EX2-039"] }] },
    });
    await s.ready();

    expect(s.perm("gulfmon").currentDP).toBe(12_000);
    assertNoLoudGap(s);
  });
});
