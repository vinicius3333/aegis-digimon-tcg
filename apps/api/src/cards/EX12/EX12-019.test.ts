import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-019 Nezhamon", () => {
  it("gains Digimon-source immunity and +4000 when an attack target switches, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-019", as: "source", dp: 12000 },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("source").currentDP).toBe(16000);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("source").currentDP).toBe(16000);
  });

  it("unsuspends itself when its controller's security is removed, once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-019", as: "source", suspended: true }], security: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("source").isSuspended).toBe(false);

    s.perm("source").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("does not unsuspend for an opponent security removal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-019", as: "source", suspended: true }], security: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("keeps Engage as an end-of-turn optional self-attack", () => {
    const compiled = registeredCompiledCards.get("EX12-019")!;
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    });
  });

  it("encodes all printed keywords, evolution, and both shared Once Per Turn watchers", () => {
    const compiled = registeredCompiledCards.get("EX12-019")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    const staticKeywords = compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword);
    expect(staticKeywords).toEqual(["Engage"]);
    const sourceKeywords = compiled.effects
      .filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.actions ?? [])
      .filter((action) => action.kind === "GainKeyword")
      .map((action) => action.keyword.keyword);
    expect(sourceKeywords).toEqual(["Rush", "Collision", "Piercing", "Blocker"]);
    expect(compiled.effects.filter((effect) => effect.trigger === "AllTurns")).toHaveLength(2);
    const switched = compiled.effects.find((effect) => effect.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenAttackTargetSwitched"))!;
    expect(switched).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [
      { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"], duration: "untilOpponentTurnEnd" },
      { kind: "ModifyDP", amount: 4000, duration: "untilOpponentTurnEnd" },
    ] }] });
    const security = compiled.effects.find((effect) => effect.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenSecurityRemoved"))!;
    expect(security).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }] }] });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
