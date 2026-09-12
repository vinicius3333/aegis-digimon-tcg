import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-203.js";
import "./P-035.js";
import "./P-036.js";
import "../BT19/BT19-064.js";

describe("P-203 Justimon: Accel Arm", () => {
  it("encodes both named evolution paths", () => {
    expect(runtimeCompiledCard("P-203")!.digivolutionRequirement).toEqual([
      { namesExact: ["Justimon: Blitz Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
      { level: 5, names: ["Cyberdramon"], cost: 3, isAlternate: true },
    ]);
  });

  it("shares the once-per-turn De-Digivolve, Option cost, and keyword gain across three timings", () => {
    const card = runtimeCompiledCard("P-203")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "DeDigivolve",
            amount: 1,
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            cost: { kind: "trash", target: { count: 1, filter: { zone: "battleArea", kind: ["Option"] } } },
          },
          { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        ],
      });
    }
    expect(card.effects.filter((effect) => effect.sharedUseKey === "ir-shared-0")).toHaveLength(3);
  });

  it("restricts one opponent Digimon after either player's battle-area Option is effect-trashed", () => {
    expect(runtimeCompiledCard("P-203")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenOptionInBattleAreaTrashed",
          actions: [
            { kind: "Restrict", restriction: "digivolve" },
            { kind: "Restrict", restriction: "attackPlayers", target: { sameTarget: true } },
          ],
        },
      ],
    });
  });

  it("publicly plays for 12, de-digivolves the legal Lv.5 stack, trashes its own Option, and hands off", async () => {
    let s!: ReturnType<typeof setupEngine>;
    const snapshots: Array<{ pierce: boolean; securityAttack: number; digivolve: boolean; attackPlayers: boolean }> =
      [];
    s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-035", as: "ownOption" }],
          hand: [{ card: "P-203", as: "source" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-076", as: "victim", under: ["BT1-066", "BT1-073"] }],
          hand: [{ card: "BT1-076", as: "opponentEvolver" }],
          deck: Array(20).fill("BT1-009"),
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind !== "effectResolved" || event.sourceCardId !== "P-203") return;
          const source = s.perm("source");
          snapshots.push({
            pierce: observe(s.engine).hasPierce(source),
            securityAttack: observe(s.engine).keywordAmount(source, "SecurityAttack"),
            digivolve: observe(s.engine).isRestricted(s.perm("victim"), "digivolve"),
            attackPlayers: observe(s.engine).isRestricted(s.perm("victim"), "attackPlayers"),
          });
        },
      },
    );
    const oldTopId = s.perm("victim").topCard.instanceId;
    const ownOptionId = s.inst("ownOption").instanceId;
    const sourceId = s.inst("source").instanceId;
    const victimPermanentId = s.perm("victim").permanentId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard.instanceId === sourceId &&
        s.perm("victim").topCard.cardId === "BT1-073" &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ownOptionId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: -2, reason: "playCard" });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ownOptionId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === oldTopId)).toBe(true);
    expect(snapshots).toContainEqual({ pierce: true, securityAttack: 1, digivolve: true, attackPlayers: true });
    expect(s.perm("victim").permanentId).toBe(victimPermanentId);
    await settle(() => s.state.turnSeat === 1);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: victimPermanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: victimPermanentId,
        instanceId: s.inst("opponentEvolver").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("shares the public evolution/attack Once Per Turn, grants both battle keywords, and resets naturally", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-064", as: "base" },
            { card: "P-035", as: "ownOption" },
          ],
          hand: [{ card: "P-203", as: "source" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-076", as: "firstTarget", suspended: true, under: ["BT1-073"] },
            { card: "BT1-076", as: "resetTarget", suspended: true, under: ["BT1-066", "BT1-073"] },
            { card: "BT1-081", as: "secondBattleTarget", suspended: true },
            { card: "P-036", as: "opponentOption" },
          ],
          hand: ["BT1-009"],
          deck: Array(20).fill("BT1-009"),
          security: Array(7).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sourceInstanceId = s.inst("source").instanceId;
    const sourcePermanentId = s.perm("base").permanentId;
    const baseInstanceId = s.inst("base").instanceId;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const firstTargetTopId = s.perm("firstTarget").topCard.instanceId;
    const resetTargetTopId = s.perm("resetTarget").topCard.instanceId;
    const ownOptionId = s.inst("ownOption").instanceId;
    const opponentOptionId = s.inst("opponentOption").instanceId;
    const secondBattleTargetId = s.perm("secondBattleTarget").permanentId;
    const resetTargetId = s.perm("resetTarget").permanentId;
    preferred.push(firstTargetId);
    s.state.memory = 5;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: sourcePermanentId,
        instanceId: sourceInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === sourceInstanceId && s.state.pendingDecision === undefined);
    preferred.push(ownOptionId);
    expect(s.state.memory).toBe(4);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 4, reason: "digivolve" });
    expect(s.perm("base").permanentId).toBe(sourcePermanentId);
    expect(s.perm("base").topCard.instanceId).toBe(sourceInstanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ownOptionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === resetTargetId)).toBe(true);
    expect(s.perm("firstTarget").topCard.cardId).toBe("BT1-073");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstTargetTopId)).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourcePermanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstTargetId) &&
        s.state.players[1]!.security.length === 5 &&
        s.events.some((event) => event.kind === "combatResolved" && event.attackerPermanentId === sourcePermanentId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("base").topCard.instanceId).toBe(sourceInstanceId);
    expect(s.perm("resetTarget").topCard.instanceId).toBe(resetTargetTopId);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === opponentOptionId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").permanentId).toBe(sourcePermanentId);
    expect(s.perm("base").topCard.instanceId).toBe(sourceInstanceId);
    await advance(s.engine).verb.suspend([resetTargetId, secondBattleTargetId]);
    preferred.length = 0;
    preferred.push(resetTargetId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourcePermanentId,
        target: { kind: "permanent", permanentId: secondBattleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("resetTarget").topCard.cardId === "BT1-073" &&
        s.state.players[1]!.trash.some((card) => card.instanceId === opponentOptionId) &&
        s.state.players[1]!.security.length === 3 &&
        s.events.filter((event) => event.kind === "combatResolved" && event.attackerPermanentId === sourcePermanentId)
          .length >= 2 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("resetTarget").topCard.cardId).toBe("BT1-073");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === opponentOptionId)).toBe(true);
    expect(s.state.players[1]!.security.length).toBe(3);
    expect(
      s.events.filter((event) => event.kind === "combatResolved" && event.attackerPermanentId === sourcePermanentId),
    ).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === resetTargetTopId)).toBe(true);
    expect(s.perm("base").permanentId).toBe(sourcePermanentId);
    expect(s.perm("base").topCard.instanceId).toBe(sourceInstanceId);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("resetTarget"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("resetTarget"), "attackPlayers")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the All Turns watcher once for two same-turn Option trashes, even across controllers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-203", as: "source" },
            { card: "BT19-064", as: "otherAttacker" },
            { card: "P-035", as: "ownOption" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-076", as: "firstTarget", suspended: true, under: ["BT1-073"] },
            { card: "BT1-009", as: "secondTarget" },
            { card: "BT1-009", as: "otherBattleTarget", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "attackTarget", suspended: true, dp: 1000 },
            { card: "P-036", as: "opponentOption" },
            { card: "P-036", as: "spareOption" },
          ],
          hand: ["BT1-009"],
          deck: Array(20).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("source").permanentId;
    const otherAttackerId = s.perm("otherAttacker").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const otherBattleTargetId = s.perm("otherBattleTarget").permanentId;
    const attackTargetId = s.perm("attackTarget").permanentId;
    const ownOptionId = s.inst("ownOption").instanceId;
    const opponentOptionId = s.inst("opponentOption").instanceId;
    const spareOptionId = s.inst("spareOption").instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: otherAttackerId,
        target: { kind: "permanent", permanentId: otherBattleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === otherBattleTargetId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ownOptionId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).isRestricted(s.perm("firstTarget"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "digivolve")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "attackPlayers")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "permanent", permanentId: attackTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackTargetId) &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === opponentOptionId) &&
        s.state.players[1]!.battleArea.some((p) => p.permanentId === secondTargetId) &&
        s.events.some((event) => event.kind === "combatResolved" && event.attackerPermanentId === sourceId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).isRestricted(s.perm("firstTarget"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("firstTarget"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "digivolve")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "attackPlayers")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === spareOptionId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
