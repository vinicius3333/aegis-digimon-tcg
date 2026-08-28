import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-036.js";
import "./index.js";

describe("BT20-036 BanchoLeomon", () => {
  it("de-digivolves and lowers DP on entry, then DNA-digivolves this Digimon with another before the attack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", amount: 2 },
          { kind: "ModifyDP", amount: -5000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          materials: { count: 2, includeRef: "self" },
          into: { nameOrTrait: [{ tokens: ["Chaosmon"], match: "name" }] },
          optional: true,
        },
        { kind: "Attack", optional: true, condition: { kind: "ifThisEffectActed" } },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }],
    });
  });

  it("reduces its play cost by 5 with ACCEL, then applies De-Digivolve 2 and -5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "accel" }],
          hand: [{ card: "BT20-036", as: "bancho" }],
        },
        1: {
          battleArea: [{ card: "BT20-035", dp: 10000, under: ["BT20-032", "BT20-034"], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bancho").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0 && s.perm("target").currentDP === 5000);
    expect(s.state.memory).toBe(5);
  });

  it("redirects an opposing attack to the inherited host once on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-036", dp: 15000, as: "host", under: ["BT20-036"] }],
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

  it("DNA digivolves itself with another Digimon at turn end, then attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-036", as: "bancho" },
            { card: "BT20-035", as: "kazuchimon" },
          ],
          hand: [{ card: "BT16-036", as: "chaosmon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("bancho"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-036") &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
