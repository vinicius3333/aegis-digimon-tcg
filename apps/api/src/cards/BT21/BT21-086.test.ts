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
  ])("start of main %s gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const setup = setupEngine({
      0: { battleArea: [{ card: "BT21-086", as: "marcus" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await setup.ready();
    setup.state.memory = 0;

    await advance(setup.engine).fire(EffectTiming.OnStartMainPhase, setup.perm("marcus"));
    expect(setup.state.memory).toBe(expectedGain);
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

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => setup.perm("existingMarcus").isSuspended, 200);

    expect(setup.perm("existingMarcus").isSuspended).toBe(true);
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
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;

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
        setup.perm("opponent").currentDP === 1000,
    );

    expect(observe(setup.engine).hasPierce(setup.perm("ally"))).toBe(true);
    expect(setup.perm("ally").currentDP).toBe(6000);
    expect(setup.perm("opponent").currentDP).toBe(1000);
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
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 4000 }] },
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
    expect(setup.perm("opponent").currentDP).toBe(4000);
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
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
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
    expect(setup.perm("opponent").currentDP).toBe(7000);
  });

  it("plays itself from Security without paying cost", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
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
    await settle(() =>
      setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("marcus").instanceId),
    );
    expect(setup.state.memory).toBe(0);
    expect(
      setup.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === setup.perm("marcus").permanentId,
      ),
    ).toBe(false);
  });
});
