import { describe, expect, it } from "vitest";
import { compiled as BT25_043 } from "./BT25-043.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-043 Habakirimon", () => {
  it("recovers first, then trashes the top security of a player with the most security", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_043.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(3);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "RecoverByTrashingMostSecurity",
        amount: 1,
        recover: false,
      });
      expect((effect?.actions?.[1] as { optional?: boolean }).optional).toBeUndefined();
      expect(effect?.actions?.[2]).toMatchObject({ condition: { kind: "ifThisEffectActed" } });
    }
  });

  it("only unsuspends after the most-security trash succeeds", async () => {
    const success = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-043", as: "habakiri", suspended: true }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoSelectCards: true },
    );
    await success.ready();
    await advance(success.engine).fireForPermanent(EffectTiming.OnUseAttack, success.perm("habakiri"));
    expect(success.perm("habakiri").isSuspended).toBe(false);
    expect(success.state.players[0]!.security).toHaveLength(0);

    const noEligiblePlayer = setupEngine({
      0: { battleArea: [{ card: "BT25-043", as: "habakiri", suspended: true }] },
    });
    await noEligiblePlayer.ready();
    await advance(noEligiblePlayer.engine).fireForPermanent(
      EffectTiming.OnUseAttack,
      noEligiblePlayer.perm("habakiri"),
    );
    expect(noEligiblePlayer.perm("habakiri").isSuspended).toBe(true);
  });

  it("naturally resolves Recovery, most-security trash, and unsuspend during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-043", as: "habakiri" }],
          security: [{ card: "BT1-001", as: "security" }],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
        1: { security: [] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("habakiri").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("habakiri").isSuspended && s.state.players[0]!.trash.length === 1);

    expect(s.perm("habakiri").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("prevents all matching Glowing Dawn Digimon from leaving with one once-per-turn replacement", () => {
    const effect = BT25_043.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as {
      affectsAll?: boolean;
      target?: { filter?: unknown; count?: unknown };
      frequency?: string;
    };
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.target).toMatchObject({
      count: "all",
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
      },
    });
  });

  it("protects every matching trait permanent, but not a non-matching Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-043", as: "habakiri" },
            { card: "BT25-032", as: "matchingOne" },
            { card: "BT25-035", as: "matchingTwo" },
            { card: "BT1-009", as: "nonMatching" },
          ],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("matchingOne").permanentId, s.perm("matchingTwo").permanentId, s.perm("nonMatching").permanentId],
        "byBattle",
      ),
    ).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT25-032", "BT25-035"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
