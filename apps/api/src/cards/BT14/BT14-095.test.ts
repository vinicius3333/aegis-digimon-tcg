import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-095.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-095", () => {
  it("makes one opposing Digimon cause its controller to lose 2 memory when suspended", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          duration: "untilOpponentTurnEnd",
          effectText: "[All Turns] When this Digimon becomes suspended, lose 2 memory.",
        },
      ],
    });
  });

  it("activates its main effect and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally makes the opposing Digimon cost its controller 2 memory when it suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-085", as: "mimi" }],
          hand: [{ card: "BT14-095", as: "option" }],
        },
        1: { battleArea: [{ card: "BT14-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const memoryBeforeAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBeforeAttack - 2);

    expect(s.state.memory).toBe(memoryBeforeAttack - 2);
    expect(s.perm("target").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("naturally grants the watcher from a Security check and applies it on a later suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "target" },
            { card: "BT14-058", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-095", as: "securityOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-095"));
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);
    expect(s.perm("target").isSuspended).toBe(false);

    const memoryBeforeSecondAttack = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBeforeSecondAttack - 2);

    expect(s.state.memory).toBe(memoryBeforeSecondAttack - 2);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
