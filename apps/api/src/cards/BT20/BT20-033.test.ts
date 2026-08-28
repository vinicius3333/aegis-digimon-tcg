import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-033.js";
import "./index.js";

describe("BT20-033 LoaderLeomon", () => {
  it("restricts one opposing Digimon's When Digivolving activation and lowers its DP on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" },
          { kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd", target: { sameTarget: true } },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, target: { isSelf: true } }],
        },
      ],
    });
  });

  it("applies both the timing lock and -3000 DP through the opponent's turn end duration", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-033", as: "loader" }] },
        1: { battleArea: [{ card: "BT20-030", dp: 6000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === 3000 &&
        observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"),
    );
  });

  it("redirects an opposing player attack to the inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }],
          security: ["BT20-001"],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
