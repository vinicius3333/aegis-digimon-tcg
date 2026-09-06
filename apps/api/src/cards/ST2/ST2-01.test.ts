import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-01.js";
import "../BT11/BT11-013.js";

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
    expect(subTriggers.map((action) => action.event)).toEqual(["whenAttacking", "whenOpponentAttacks", "whenBlocked"]);
    for (const action of subTriggers) {
      expect(action.actions).toEqual([
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "untilEndOfBattle",
        },
      ]);
      expect(action.fireCondition).toMatchObject({
        kind:
          action.event === "whenAttacking" || action.event === "whenBlocked" ? "triggerDefenderMatchesFilter" : "allOf",
      });
    }
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives its host +1000 DP while battling a source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 3000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Tsunomon's +1000 DP turns the 3000-DP attacker into a 4000-DP winner;
    // without the inherited bonus, this matchup would be an equal-DP deletion.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not grant the bonus against a Digimon that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 2000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true, under: ["ST2-01"] }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("applies the bonus when its attack is blocked by a source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-09", as: "host", under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "BT11-013", as: "blocker" }], security: ["BT1-001"] },
    });
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant the inherited battle bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-09", as: "host", suspended: true, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST1-09", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
