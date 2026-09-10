import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-005.js";

describe("BT18-005 Kozenimon", () => {
  it("draws once when its host wins a battle and does not repeat in the turn", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });

    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-059",
              dp: 13000,
              as: "host",
              under: ["BT18-005", "BT12-058", "BT12-061", "BT12-069"],
            },
            { card: "BT1-030", dp: 3000, as: "other" },
          ],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-013", as: "notDrawn" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-013"],
          battleArea: [
            { card: "BT1-030", dp: 2000, suspended: true, as: "targetA" },
            { card: "BT1-030", dp: 2000, suspended: true, as: "targetB" },
            { card: "BT1-030", dp: 2000, suspended: true, as: "targetC" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    const targetAId = s.perm("targetA").permanentId;
    const targetCId = s.perm("targetC").permanentId;

    const attack = (targetAlias: string) =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(targetAlias).permanentId },
      });
    expect(attack("targetA")).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetAId));
    expect(s.state.players[0]!.hand).toHaveLength(0);

    const hostAttack = (targetAlias: string) =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(targetAlias).permanentId },
      });
    expect(hostAttack("targetB")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(hostAttack("targetC")).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetCId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(false);
  });

  it("does not draw when its host loses the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT11-059",
            dp: 3000,
            as: "host",
            under: ["BT18-005", "BT12-058", "BT12-061", "BT12-069"],
          },
        ],
        deck: [{ card: "BT1-009", as: "top" }],
      },
      1: { battleArea: [{ card: "BT1-030", dp: 4000, suspended: true, as: "target" }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("resets the inherited draw limit on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-059", dp: 13000, as: "host", under: ["BT18-005"] }],
          deck: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 2000, suspended: true, as: "first" },
            { card: "BT1-030", dp: 2000, suspended: true, as: "second" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    const attack = (targetAlias: string) =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(targetAlias).permanentId },
      });

    expect(attack("first")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    s.perm("host").isSuspended = false;
    // The opponent's Active phase readies its Digimon; suspend the second battle target
    // through the production verb so the next-turn attack remains legal.
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await s.ready();
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
