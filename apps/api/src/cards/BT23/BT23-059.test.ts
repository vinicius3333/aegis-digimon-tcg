import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-059.js";

describe("BT23-059 Justimon: Blitz Arm", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-059")).toMatchObject({
      cardId: "BT23-059",
      nameEn: "Justimon: Blitz Arm",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Justimon: Accel Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
      { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes a battle-area Option as cost, deletes the lowest-cost opponent, and unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-059", as: "justimon", suspended: true },
            { card: "BT23-100", as: "option" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT23-047", as: "examon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.perm("justimon").isSuspended).toBe(false);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("examon"));
    expect(s.perm("justimon").isSuspended).toBe(false);
  });

  it("exposes Blocker through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-059", as: "justimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("justimon"), "Blocker")).toBe(true);
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords[0].keyword).toBe("Blocker");
  });

  it("does not delete when no battle-area Option can pay the cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-059", as: "justimon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "low" }] },
    });
    const lowId = s.perm("low").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("justimon"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId)).toBe(true);
  });

  it("mandatorily trashes any Option in the battle area to delete the opponent's lowest-play-cost Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      const action = effect.actions[0];
      expect(effect.frequency).toBe("OncePerTurn");
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestPlayCost" }, count: 1 },
        cost: {
          kind: "trash",
          target: {
            filter: { zone: "battleArea", kind: ["Option"], placedInBattleAreaByEffect: true },
            count: 1,
          },
        },
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

  it("digivolves for 1 from either named Justimon and for 3 from an off-color level-5 CS card", () => {
    for (const baseCard of ["BT11-073", "BT10-067", "BT23-044"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "BT23-059", as: "blitz" }] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("blitz").instanceId,
        }),
      ).toEqual({ ok: true });
    }
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT23-059", as: "blitz" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("blitz").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
