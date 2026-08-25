import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-032.js";
import "./index.js";

describe("BT20-032 Bulkmon", () => {
  it("may take the top security card at three or more, then mandates Recovery +1 at two or fewer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
        optional: true,
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", op: "lte", value: 2 },
      });
      expect(effect?.actions[1]?.optional).not.toBe(true);
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });

  it("takes security at three, then immediately recovers from the deck at two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: ["BT20-010", "BT20-011", "BT20-012"],
          deck: [{ card: "BT20-013", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bulkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.security.length === 3 &&
        s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId),
    );
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("inherits one memory gain when its surviving host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-034", as: "host", under: ["BT20-032"] }] },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 6);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
