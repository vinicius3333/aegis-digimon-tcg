import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-146.js";
import "../index.js";

describe("P-146 Reload Plug-In Q", () => {
  it("matches the canonical card and its four printed effects", () => {
    expect(getCardDefinition("P-146")).toMatchObject({
      cardId: "P-146",
      nameEn: "Reload Plug-In Q",
      colors: ["Yellow"],
      playCost: 3,
    });

    const compiled = runtimeCompiledCard("P-146")!;
    expect(compiled.effects).toHaveLength(4);
  });

  it("waives color for a Tamer and places itself under a non-white Digimon", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { kind: ["Tamer"] } } }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Digimon"], excludeColors: ["White"] } }],
    });
  });

  it("has one inherited battle-deletion replacement with the exact Reload source", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    const replacements = compiled.effects.flatMap((effect) =>
      effect.actions.filter((action) => action.kind === "Replacement"),
    );
    expect(replacements).toHaveLength(1);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "forTheTurn" }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "place",
                destination: "security",
                position: "bottom",
                target: {
                  count: 1,
                  filter: {
                    controller: "mine",
                    zone: "digivolutionCards",
                    sameHost: true,
                    hostFilter: { isSelfRef: true },
                    nameOrTrait: [{ tokens: ["Reload Plug-In Q"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("gives an opposing Digimon Security Attack -1 from a real Security attack", async () => {
    const s = setupEngine(
      {
        0: {
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          hand: [{ card: "BT1-009", as: "ownerPlayable" }],
          security: [{ card: "P-146", as: "plug" }, ...Array.from({ length: 4 }, () => "BT1-009")],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const securityChecksBefore = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > securityChecksBefore &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the Tamer waiver and pays its printed cost from legal memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-146", as: "plug" },
            { card: "BT1-009", as: "ownerPlayable" },
          ],
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-009", as: "host" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const sourceId = s.inst("plug").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
    await settle(
      () => s.perm("host").stack.some((card) => card.instanceId === sourceId) && s.state.pendingDecision === undefined,
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(s.perm("host").stack.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sourceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("prevents a battle deletion by placing the exact inherited source at Security bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", suspended: true, under: [{ card: "P-146", as: "source" }] }],
          hand: [{ card: "BT1-009", as: "ownerPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.some((card) => card.instanceId === sourceId) &&
        s.perm("attacker").topCard.instanceId === s.inst("attacker").instanceId &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore + 1);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(false);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows both physical inherited sources to pay in one battle-deletion window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-009",
              as: "host",
              suspended: true,
              under: [
                { card: "P-146", as: "source1" },
                { card: "P-146", as: "source2" },
              ],
            },
          ],
          hand: [{ card: "BT1-009", as: "ownerPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const source1Id = s.inst("source1").instanceId;
    const source2Id = s.inst("source2").instanceId;
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "combatResolved") &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore + 2);
    expect(s.state.players[0]!.security.at(-2)?.instanceId).toBe(source1Id);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(source2Id);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === source1Id)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === source2Id)).toBe(false);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("can pay after Barrier in the same battle-deletion window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-035", as: "host", suspended: true, under: [{ card: "P-146", as: "source" }] }],
          hand: [{ card: "BT1-009", as: "ownerPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: [{ card: "BT1-009", as: "barrierCost" }, ...Array.from({ length: 4 }, () => "BT1-009")],
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const barrierCostId = s.inst("barrierCost").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.security.some((card) => card.instanceId === sourceId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === barrierCostId)).toBe(true);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.cardId).toBe("BT14-035");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-025");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
