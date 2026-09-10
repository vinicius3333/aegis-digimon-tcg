import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX8-024.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX8-024", () => {
  it("matches the catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-024")).toMatchObject({
      cardId: "EX8-024",
      nameEn: "MegaSeadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Aquatic", "DS"],
      effectText: expect.stringContaining("[On Play] [When Digivolving] 1 of your Digimon unsuspends."),
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] By placing 1 of your other Digimon as this Digimon's bottom digivolution card, it unsuspends.",
    });
  });
  it("traces unsuspend triggers, the one-memory suspension restriction, and inherited placement cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Unsuspend",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "memoryAtLeast", value: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    });
  });
  it("unsuspends an allied Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-024", as: "source", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
  });
  it("restricts one opposing Digimon from suspending while you have memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }], deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"] },
      1: {
        battleArea: [{ card: "EX8-021", as: "opponent" }],
        security: 1,
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
    });
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);

    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("does not consume the attack effect at 0 memory, then applies it at 1 (Q3891)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }] },
      1: { battleArea: [{ card: "EX8-021", as: "opponent" }], security: 2 },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("pays the inherited placement cost, moves the other Digimon under, and unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const otherId = s.perm("other").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === otherId));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack[0]!.instanceId).toBe(otherId);
  });

  it("keeps the inherited effect optional when its placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("other").instanceId),
    ).toBe(true);
  });

  it("uses the level-4 DS route for 3 and unsuspends an ally when digivolving", async () => {
    expect(digivolutionRequirementsFor("EX8-024")).toContainEqual({
      level: 4,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-020", as: "dolphmon" },
            { card: "EX8-017", as: "ally", suspended: true },
          ],
          hand: [{ card: "EX8-024", as: "megaSeadramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dolphmon").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("ally").isSuspended);
    expect(s.state.memory).toBe(0);
  });

  it("uses the standard Blue level-4 route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "blueBase" }],
        hand: [{ card: "EX8-024", as: "megaSeadramon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("megaSeadramon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("resets the inherited placement effect after the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "firstOther" },
            { card: "EX8-017", as: "secondOther" },
          ],
          deck: ["BT1-045"],
        },
        1: { security: 3, deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstOtherId = s.inst("firstOther").instanceId;
    const secondOtherId = s.inst("secondOther").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === firstOtherId));
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondOtherId)).toBe(
      true,
    );

    s.state.phase = Phase.End;
    const nextTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.state.turnCount === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === secondOtherId));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(secondOtherId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextTurn;
  });
});
