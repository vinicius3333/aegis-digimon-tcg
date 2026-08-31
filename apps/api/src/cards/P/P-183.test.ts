import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-183.js";

describe("P-183 Gaiomon", () => {
  it("encodes Reboot, Blocker, and the temporary opponent attack grant", () => {
    const card = runtimeCompiledCard("P-183")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { isSelf: true, count: 1 } },
      ],
    });
  });

  it("trashes the opponent's top security card once per turn when an attack target changes", () => {
    expect(runtimeCompiledCard("P-183")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("exposes Reboot and Blocker on the live Gaiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-183", as: "gaiomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Blocker")).toBe(true);
  });

  it("trashes the opponent's security when Blocker switches a real attack target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-183", as: "gaiomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("gaiomon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
