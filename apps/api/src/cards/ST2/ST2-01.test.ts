import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-01.js";

describe("ST2-01 Tsunomon", () => {
  it("matches the inherited battle-window contract", () => {
    const definition = getCardDefinition("ST2-01")!;
    const compiled = getCompiledCard("ST2-01")!;
    const effect = compiled.effects[0]!;

    expect(definition.inheritedEffectText).toContain("gets +1000 DP");
    expect(effect.trigger).toBe("YourTurn");
    expect(effect.isInherited).toBe(true);
    expect(effect.actions).toHaveLength(3);
    expect(effect.actions.map((action) => action.kind)).toEqual(["SubTrigger", "SubTrigger", "SubTrigger"]);
    const subTriggers = effect.actions as Array<{
      event?: string;
      actions?: unknown;
      fireCondition?: unknown;
    }>;
    expect(subTriggers.map((action) => action.event)).toEqual([
      "whenAttacking",
      "whenOpponentAttacks",
      "whenBlocked",
    ]);
    for (const action of subTriggers) {
      expect(action.actions).toEqual([{
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 1000,
        duration: "untilEndOfBattle",
      }]);
      expect(action.fireCondition).toMatchObject({
        kind: action.event === "whenAttacking" ? "triggerDefenderMatchesFilter" : "allOf",
      });
    }
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives its host +1000 DP while battling a source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 2000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true }] },
    });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Tsunomon's +1000 DP turns the 2000-DP attacker into a 3000-DP tie;
    // the attacker survives the tie while the 3000-DP defender is deleted.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not grant the bonus against a Digimon that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 2000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true, under: ["ST2-01"] }] },
    });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

});
