import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-077.js";
import "./ST14-04.js";

describe("ST14-04 Phascomon", () => {
  it("has Blocker and can't attack players on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-04", as: "phas" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phas"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(false);
  });

  it("redirects an opposing player attack through its Blocker window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST14-04", as: "phas" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "ST14-03", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("phas").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("phas").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("ST14-04 Phascomon — KB Q&A rulings", () => {
  it("attacks an opponent's suspended Digimon when forced to attack, and does not attack if only the player is a target (Q799)", async () => {
    const runForcedAttack = async (craniamonSuspended: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT13-077", as: "craniamon", suspended: craniamonSuspended }],
            security: [{ card: "BT1-009", as: "security" }],
          },
          1: { battleArea: [{ card: "ST14-04", as: "phascomon" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
      return s;
    };

    const withSuspendedTarget = await runForcedAttack(true);
    const declared = withSuspendedTarget.events.filter((event) => event.kind === "attackDeclared");
    expect(declared).toHaveLength(1);
    expect(declared[0]).toMatchObject({
      attackerCardId: "ST14-04",
      target: { kind: "permanent", permanentId: withSuspendedTarget.perm("craniamon").permanentId },
    });
    expect(withSuspendedTarget.state.players[0]!.security).toHaveLength(1);

    const onlyPlayerTarget = await runForcedAttack(false);
    expect(
      onlyPlayerTarget.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT13-077"),
    ).toBe(true);
    expect(onlyPlayerTarget.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(onlyPlayerTarget.perm("phascomon").isSuspended).toBe(false);
    expect(onlyPlayerTarget.state.players[0]!.security).toHaveLength(1);
  });
});
