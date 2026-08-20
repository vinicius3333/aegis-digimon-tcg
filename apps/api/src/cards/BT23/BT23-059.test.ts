import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-059.js";

describe("BT23-059 Justimon: Blitz Arm", () => {
  it("trashes a battle-area Option as cost, deletes the lowest-cost opponent, and unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-059", as: "justimon", suspended: true },
            { card: "BT23-100", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "low" }] },
      },
      { autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.perm("option").topCard!.instanceId;
    const lowId = s.perm("low").permanentId;
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("justimon").permanentId });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.perm("justimon").isSuspended).toBe(false);
  });

  it("has Blocker", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords[0].keyword).toBe("Blocker");
  });

  it("mandatorily trashes any Option in the battle area to delete the opponent's lowest-play-cost Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      const action = effect.actions[0];
      expect(effect.frequency).toBe("OncePerTurn");
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestPlayCost" }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "battleArea", kind: ["Option"] }, count: 1 } },
        abortOnDecline: true,
      });
      expect(action.optional).toBeUndefined();
    }
  });

  it("once per turn unsuspends and protects itself when an Option in the battle area is trashed", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionInBattleAreaTrashed",
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "forTheTurn" },
      ],
    });
  });
});
