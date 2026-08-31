import { describe, expect, it } from "vitest";
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
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: {
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(hostAttack("targetC")).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetCId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(false);
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
        deck: [{ card: "BT1-001", as: "top" }],
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
});
