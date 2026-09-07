import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-086.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT21-086 Marcus Damon", () => {
  it("registers the three printed timing windows and a real On Play suspension effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend" });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn" });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without an opposing Digimon", false, 0],
    ["with an opposing Digimon", true, 1],
  ])("start of main %s (opponent present: %s) gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const setup = setupEngine({
      0: { battleArea: [{ card: "BT21-086", as: "marcus" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await setup.ready();
    setup.state.memory = 0;

    await advance(setup.engine).fire(EffectTiming.OnStartMainPhase, setup.perm("marcus"));
    expect(setup.state.memory).toBe(expectedGain);
  });

  it("gains conditional memory through the public Start-of-Main lifecycle", async () => {
    const setup = setupEngine({
      0: {
        battleArea: [{ card: "BT21-086", as: "marcus" }],
        hand: [{ card: "BT1-009", as: "playable" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-012", "BT1-013"] },
    });
    setup.state.memory = 0;
    await setup.ready();
    const turn = setup.engine.runOneTurn();
    await advance(setup.engine).waitForMainPhase(0);
    await settle(() => setup.state.memory === 1);
    expect(setup.state.memory).toBe(1);
    advance(setup.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends a Marcus Damon on the field when played", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [{ card: "BT21-086", as: "existingMarcus" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => setup.perm("existingMarcus").isSuspended, 200);

    expect(setup.perm("existingMarcus").isSuspended).toBe(true);
  });

  it("does not suspend an opponent's Marcus Damon", async () => {
    const setup = setupEngine(
      {
        0: { hand: [{ card: "BT21-086", as: "newMarcus" }] },
        1: { battleArea: [{ card: "BT21-086", as: "opponentMarcus" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;
    await setup.ready();
    const opponentMarcusId = setup.perm("opponentMarcus").permanentId;

    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("newMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => setup.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-086"));
    expect(setup.perm("opponentMarcus").permanentId).toBe(opponentMarcusId);
    expect(setup.perm("opponentMarcus").isSuspended).toBe(false);
  });

  it("grants Piercing and +3000 DP to the same Digimon, then gives an opponent -3000 DP", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [
            { card: "BT21-086", as: "existingMarcus" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(setup.engine).hasPierce(setup.perm("ally")) &&
        setup.perm("ally").currentDP === 6000 &&
        setup.state.players[1]!.trash.some((card) => card.instanceId === setup.inst("opponent").instanceId),
    );

    expect(observe(setup.engine).hasPierce(setup.perm("ally"))).toBe(true);
    expect(setup.perm("ally").currentDP).toBe(6000);
    expect(setup.state.players[1]!.battleArea).toHaveLength(0);
    expect(setup.state.players[1]!.trash.map((card) => card.instanceId)).toContain(setup.inst("opponent").instanceId);
  });

  it("applies Piercing in a public battle and expires the modifiers at turn end", async () => {
    const preferred: string[] = [];
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [
            { card: "BT21-086", as: "existingMarcus" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "opponent" },
            { card: "BT1-010", as: "battleTarget", suspended: true },
          ],
          security: ["BT1-001"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(setup.perm("ally").permanentId, setup.perm("opponent").permanentId);
    setup.state.memory = 10;
    await setup.ready();
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("newMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(setup.engine).hasPierce(setup.perm("ally")));
    expect(setup.perm("ally").currentDP).toBe(6000);
    expect(setup.perm("opponent").currentDP).toBe(3000);

    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: setup.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(setup.engine).isAttacking() && setup.state.players[1]!.trash.some((card) => card.cardId === "BT1-010"),
    );
    expect(setup.state.players[1]!.security).toHaveLength(0);
    expect(setup.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);

    await advance(setup.engine).runTurn(0);
    expect(observe(setup.engine).hasPierce(setup.perm("ally"))).toBe(false);
    expect(setup.perm("ally").currentDP).toBe(3000);
    expect(setup.perm("opponent").currentDP).toBe(6000);
  });

  it("declining the On Play suspension leaves every Marcus unsuspended and grants no modifiers", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [
            { card: "BT21-086", as: "existingMarcus" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;

    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("newMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => setup.state.pendingDecision === undefined);

    expect(setup.perm("existingMarcus").isSuspended).toBe(false);
    expect(setup.perm("ally").currentDP).toBe(3000);
    expect(observe(setup.engine).hasPierce(setup.perm("ally"))).toBe(false);
    expect(setup.perm("opponent").currentDP).toBe(3000);
  });

  it("triggers only for this Marcus and only once per turn", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-086", as: "marcus" },
            { card: "BT1-085", as: "otherTamer" },
            { card: "BT1-009", as: "ally", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "BT10-055", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await setup.ready();

    await advance(setup.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: setup.perm("otherTamer").permanentId,
    });
    expect(setup.perm("ally").currentDP).toBe(3000);

    await advance(setup.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: setup.perm("marcus").permanentId,
    });
    await settle(() => setup.perm("ally").currentDP === 6000);
    await advance(setup.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: setup.perm("marcus").permanentId,
    });
    expect(setup.perm("ally").currentDP).toBe(6000);
    expect(setup.perm("opponent").currentDP).toBe(10000);
  });

  it("does not repeat one Marcus watcher across public same-turn suspensions", async () => {
    const preferred: string[] = [];
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-086", as: "source" },
            { card: "BT1-009", as: "firstAlly" },
            { card: "BT1-010", as: "secondAlly" },
            { card: "BT10-009", as: "unsuspender", under: ["BT10-008"] },
          ],
          hand: [
            { card: "BT21-086", as: "firstMarcus" },
            { card: "BT21-086", as: "secondMarcus" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "opponent" }],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    setup.state.memory = 10;
    await setup.ready();

    preferred.push(setup.perm("source").permanentId, setup.perm("firstAlly").permanentId);
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("firstMarcus").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => setup.perm("firstAlly").currentDP === 6000);
    expect(observe(setup.engine).hasPierce(setup.perm("firstAlly"))).toBe(true);

    preferred.splice(0, preferred.length, setup.perm("source").permanentId);
    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("unsuspender").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => setup.perm("source").isSuspended === false && !observe(setup.engine).isAttacking());
    expect(setup.perm("source").isSuspended).toBe(false);
    expect(setup.state.players[1]!.security).toHaveLength(1);

    preferred.splice(0, preferred.length, setup.perm("source").permanentId, setup.perm("secondAlly").permanentId);
    expect(
      setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("secondMarcus").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => setup.perm("source").isSuspended);

    expect(setup.perm("firstAlly").currentDP).toBe(6000);
    expect(observe(setup.engine).hasPierce(setup.perm("firstAlly"))).toBe(true);
    expect(setup.perm("secondAlly").currentDP).toBe(2000);
    expect(observe(setup.engine).hasPierce(setup.perm("secondAlly"))).toBe(false);
  });

  it("plays itself from Security without paying cost", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: { security: [{ card: "BT21-086", as: "marcus" }] },
      },
      { autoDeclineOptional: true },
    );
    setup.state.memory = 0;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("marcus").instanceId) &&
        setup.events.some((event) => event.kind === "securityChecked") &&
        !observe(setup.engine).isAttacking(),
    );
    expect(setup.state.memory).toBe(0);
    expect(setup.state.players[1]!.security).toHaveLength(0);
    expect(observe(setup.engine).isAttacking()).toBe(false);
    expect(
      setup.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === setup.perm("marcus").permanentId,
      ),
    ).toBe(false);
  });
});
