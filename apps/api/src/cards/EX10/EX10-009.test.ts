import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-009.js";

describe("EX10-009 Creepymon", () => {
  it("models both deletion fallback branches and the conditional breeding-area play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: "all" },
          },
          { kind: "TrashTopDeck", controller: "opponent", amount: 5, condition: { kind: "ifThisEffectDidNotDelete" } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          breeding: true,
          optional: true,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red", "Purple"],
              dp: { op: "lte", value: 5000 },
            },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{ kind: "Attack", withoutSuspending: true, optional: true }],
    });
  });

  it("deletes every tied lowest-DP Digimon and does not mill when at least one deletion succeeds", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-009", as: "creepymon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowA", dp: 3000 },
          { card: "BT1-010", as: "lowB", dp: 3000 },
          { card: "BT1-014", as: "high", dp: 5000 },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
      },
    });
    const deckBefore = s.state.players[1]!.deck.length;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("creepymon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("high").permanentId]);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("Q5016 mills exactly 5 after an actual deletion trigger deletes no opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-009", as: "creepymon" }] },
      1: { deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("creepymon").permanentId]);
    await settle(() => s.state.players[1]!.trash.length === 5);

    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX10-009")).toBe(true);
  });

  it("at the 10-card boundary plays an eligible Digimon into empty breeding without firing On Play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [
            { card: "EX10-007", as: "eligible" },
            { card: "EX10-008", as: "tooLarge" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent" }],
          trash: Array.from({ length: 10 }, () => "BT1-001"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    const opponentDp = s.perm("opponent").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("creepymon"));
    await settle(() => s.state.players[0]!.breeding?.topCard.instanceId === s.inst("eligible").instanceId);

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX10-007");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX10-008"]);
    expect(s.perm("opponent").currentDP).toBe(opponentDp);
  });

  it("does not offer the breeding play at 9 opposing trash cards or with an occupied breeding area", async () => {
    for (const [trashCount, breeding] of [
      [9, undefined],
      [10, { card: "BT1-009", as: "occupant" }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX10-009", as: "creepymon" }],
            trash: [{ card: "EX10-007", as: "eligible" }],
            ...(breeding === undefined ? {} : { breeding }),
          },
          1: { trash: Array.from({ length: trashCount }, () => "BT1-001") },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("creepymon"));
      await settle(() => false, 30);

      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId)).toBe(
        true,
      );
      expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    }
  });

  it("attacks while already suspended at end of turn and honors optional refusal", async () => {
    const accepted = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-009", as: "creepymon", suspended: true }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );

    const attack = advance(accepted.engine).fire(EffectTiming.OnEndTurn, accepted.perm("creepymon"));
    await settle(() => accepted.state.pendingDecision !== undefined);
    const attackTarget = accepted.state.pendingDecision!;
    expect(
      accepted.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackTarget.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await attack;
    await settle(() => accepted.state.players[1]!.security.length === 0 && !observe(accepted.engine).isAttacking());
    expect(accepted.perm("creepymon").isSuspended).toBe(true);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-009", as: "creepymon", suspended: true }] },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );

    await advance(declined.engine).fire(EffectTiming.OnEndTurn, declined.perm("creepymon"));
    await settle(() => declined.decisions.some(({ req }) => req.kind === "optional"));
    expect(declined.state.players[1]!.security).toHaveLength(1);
  });
});
