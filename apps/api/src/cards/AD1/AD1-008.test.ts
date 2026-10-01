import { describe, expect, it } from "vitest";
import { EffectTiming, Zone, getCardDefinition, getCompiledCard, type CardInstance } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "../../cards/index.js";

describe("AD1-008 Gallantmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-008");
    const compiled = registeredCompiledCards.get("AD1-008") ?? getCompiledCard("AD1-008");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-008");
    expect(definition?.nameEn).toBe("Gallantmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("deletes multiple Digimon totaling 10000 DP, then deletes the remaining lowest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-014", as: "base" }],
          hand: [{ card: "AD1-008", as: "gallantmon" }, "BT1-009"],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "budget-a", dp: 5000 },
            { card: "BT1-010", as: "budget-b", dp: 5000 },
            { card: "BT1-010", as: "lowest-after-budget", dp: 11000, suspended: true },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const budgetAId = s.perm("budget-a").permanentId;
    const budgetBId = s.perm("budget-b").permanentId;
    const lowestAfterBudgetId = s.perm("lowest-after-budget").permanentId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetAId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetBId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestAfterBudgetId)).toBe(
      false,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses either printed alternate level-5 route for cost 3", async () => {
    for (const baseCard of ["BT9-014", "AD1-011"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gallantmon").instanceId,
          alternateRequirementIndex: baseCard === "BT9-014" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-008");
      expect(s.state.memory).toBe(2);
    }
  });

  it("gets +5000 DP on its turn only while Takato Matsuki is in its digivolution cards", async () => {
    const qualified = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "qualified", under: ["BT12-089"] }] },
    });
    await qualified.ready();
    expect(qualified.perm("qualified").currentDP).toBe(17000);

    const unqualified = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "unqualified", under: ["BT1-009"] }] },
    });
    await unqualified.ready();
    expect(unqualified.perm("unqualified").currentDP).toBe(12000);
  });

  it("is unaffected by opponent effects only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "protected", under: ["BT12-089"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasRestriction(s.perm("protected"), "beAffected")).toBe(true);
    expect(s.perm("protected").currentDP).toBe(17000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasRestriction(s.perm("protected"), "beAffected")).toBe(false);
    expect(s.perm("protected").currentDP).toBe(12000);
  });

  it("uses Rush, Raid, and Piercing together after being played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-008", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "raid-target", dp: 6000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.state.players[0]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("consumes lowest-DP Once Per Turn deletion on evolution attack and resets next turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-014", as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 12000, as: "lowest" },
            { card: "BT1-010", dp: 13000, as: "next" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    for (const seat of [0, 1] as const) {
      for (let n = 0; n < 10; n += 1) {
        s.give(seat, Zone.Deck, "BT1-009");
        s.give(seat, Zone.Security, "BT1-009");
      }
      s.give(seat, Zone.Hand, "BT1-010");
    }
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const baseId = s.perm("base").permanentId;
    const nextId = s.perm("next").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: s.inst("gallantmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === nextId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: baseId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === nextId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

const TAKATO = "BT12-089";
const PLAIN_SOURCE = "BT1-009";
const BIFROST = "BT3-101";
const MUGEN = "BT7-103";

function takatoMainEffectKey(s: EngineSetup, takato: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(takato);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith(`${TAKATO}/`),
  );
  if (effect === undefined) throw new Error("BT12-089 exposes no Main effect");
  return effect.effectKey;
}

async function digivolveGuilmonWithTakato(guilmonCardId: string) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: TAKATO, as: "takato" },
          { card: guilmonCardId, as: "guilmon" },
        ],
        hand: [{ card: "AD1-008", as: "gallantmon" }],
        trash: ["BT12-010", "BT12-016"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  const takato = s.inst("takato");
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: takato.instanceId,
      effectKey: takatoMainEffectKey(s, takato),
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.perm("guilmon").topCard?.cardId === "AD1-008" || s.state.pendingDecision?.kind === "chooseOption",
  );
  const routePrompt = s.state.pendingDecision;
  const offeredRoutes: string[] =
    routePrompt?.kind === "chooseOption" ? (JSON.parse(routePrompt.payloadJson) as { choices: string[] }).choices : [];
  const routeAnswer =
    routePrompt?.kind === "chooseOption"
      ? s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: routePrompt.decisionId,
          response: {
            kind: "chooseOption",
            optionIndex: offeredRoutes.findIndex((choice) => choice.includes("cost 3")),
          },
        })
      : { ok: true };
  expect(routeAnswer).toEqual({ ok: true });
  await settle(() => s.perm("guilmon").topCard?.cardId === "AD1-008" && s.state.pendingDecision === undefined);
  return { s, offeredRoutes };
}

type SecurityCheckBoard = { withTakato: boolean; securityOptions: string[] };

async function attackIntoOpposingSecurityOptions({ withTakato, securityOptions }: SecurityCheckBoard) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "AD1-008", as: "gallantmon", under: [withTakato ? TAKATO : PLAIN_SOURCE] },
          { card: PLAIN_SOURCE, as: "bystander" },
          ...securityOptions.map((_, index) => ({ card: PLAIN_SOURCE, as: `attacker-${index}` })),
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: {
        security: [...securityOptions, PLAIN_SOURCE, PLAIN_SOURCE, PLAIN_SOURCE],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
  );
  await s.ready();
  preferred.push(s.perm("gallantmon").topCard!.instanceId);
  for (const [index, optionId] of securityOptions.entries()) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(`attacker-${index}`).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[1]!.trash.some((card) => card.cardId === optionId),
    );
  }
  return s;
}

function opponentOfferedGallantmon(s: EngineSetup): boolean {
  const gallantmon = s.perm("gallantmon");
  return s.decisions.some(
    ({ seat, req }) =>
      seat === 1 &&
      req.kind === "chooseTargets" &&
      (req.options?.candidateInstanceIds ?? []).some(
        (id) => id === gallantmon.permanentId || id === gallantmon.topCard!.instanceId,
      ),
  );
}

async function dpAcrossLoaderLeomonDebuff({ withTakato }: { withTakato: boolean }) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "AD1-008", as: "gallantmon", under: [withTakato ? TAKATO : PLAIN_SOURCE] }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
        security: [PLAIN_SOURCE, PLAIN_SOURCE],
      },
      1: {
        hand: [{ card: "BT20-033", as: "loader" }, "BT1-010"],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
        security: [PLAIN_SOURCE, PLAIN_SOURCE],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
  );
  s.state.turnSeat = 1;
  await s.ready();
  preferred.push(s.perm("gallantmon").topCard!.instanceId);

  const loop = s.engine.startTurnLoop();
  const drive = advance(s.engine);
  await drive.waitForMainPhase(1);
  s.state.memory = 10;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("gallantmon").currentDP === 9000);
  expect(s.state.turnSeat).toBe(1);
  const opponentTurn = s.perm("gallantmon").currentDP;
  drive.endMainPhaseIfOpen(1);

  await drive.waitForMainPhase(0);
  await advance(s.engine).recompute();
  const ownTurn = s.perm("gallantmon").currentDP;
  if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  return { opponentTurn, ownTurn };
}

async function memoryLostWhenAttackingAfterIceWall({ withTakato }: { withTakato: boolean }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "AD1-008", as: "gallantmon", under: [withTakato ? TAKATO : PLAIN_SOURCE] }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
        security: [PLAIN_SOURCE, PLAIN_SOURCE],
      },
      1: {
        hand: [{ card: "EX1-068", as: "iceWall" }],
        battleArea: [{ card: "AD1-006", as: "colorSource" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
        security: [PLAIN_SOURCE, PLAIN_SOURCE, PLAIN_SOURCE],
      },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
  );
  s.state.turnSeat = 1;
  await s.ready();

  const loop = s.engine.startTurnLoop();
  const drive = advance(s.engine);
  await drive.waitForMainPhase(1);
  s.state.memory = 5;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX1-068"));
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

  await drive.waitForMainPhase(0);
  s.state.memory = 3;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gallantmon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
  const colorSourceDeletedByOwnWhenAttacking = !s.state.players[1]!.battleArea.some(
    (permanent) => permanent.topCard?.cardId === "AD1-006",
  );
  expect(colorSourceDeletedByOwnWhenAttacking).toBe(true);
  const memoryLost = 3 - s.state.memory;
  if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  return memoryLost;
}

describe("AD1-008 Gallantmon — KB Q&A rulings", () => {
  it("digivolves a [Hero] trait Guilmon through Takato Matsuki's [Main] effect for its trait route cost of 3 (Q6066)", async () => {
    const plainGuilmon = await digivolveGuilmonWithTakato("BT12-007");
    expect(plainGuilmon.offeredRoutes).not.toEqual(expect.arrayContaining([expect.stringContaining("cost 3")]));
    expect(plainGuilmon.s.state.memory).toBe(1);

    const heroGuilmon = await digivolveGuilmonWithTakato("BT21-064");
    expect(heroGuilmon.offeredRoutes).toEqual(expect.arrayContaining([expect.stringContaining("cost 3")]));
    expect(heroGuilmon.s.state.memory).toBe(2);
  });

  it("does not suspend or lose DP when an opponent's effect suspends it or gives it -3000 DP (Q6067)", async () => {
    const immune = await attackIntoOpposingSecurityOptions({ withTakato: true, securityOptions: [MUGEN, BIFROST] });
    expect(opponentOfferedGallantmon(immune)).toBe(true);
    expect(immune.perm("bystander").isSuspended).toBe(false);
    expect(immune.perm("gallantmon").isSuspended).toBe(false);
    expect(immune.perm("gallantmon").currentDP).toBe(17000);

    const unprotected = await attackIntoOpposingSecurityOptions({
      withTakato: false,
      securityOptions: [MUGEN, BIFROST],
    });
    expect(unprotected.perm("gallantmon").isSuspended).toBe(true);
    expect(unprotected.perm("gallantmon").currentDP).toBe(9000);
  });

  it("can still be chosen by an opponent's suspend effect, which then has no effect on it (Q6068)", async () => {
    const s = await attackIntoOpposingSecurityOptions({ withTakato: true, securityOptions: [MUGEN] });

    expect(opponentOfferedGallantmon(s)).toBe(true);
    expect(s.perm("bystander").isSuspended).toBe(false);
    expect(s.perm("gallantmon").isSuspended).toBe(false);
  });

  it("can be given <Security A. -1> by an opponent's effect but is not considered to have it (Q6069)", async () => {
    const immune = await attackIntoOpposingSecurityOptions({ withTakato: true, securityOptions: [BIFROST] });
    expect(opponentOfferedGallantmon(immune)).toBe(true);
    expect(observe(immune.engine).keywordAmount(immune.perm("gallantmon"), "SecurityAttack")).toBe(0);
    const immuneSecurityBefore = immune.state.players[1]!.security.length;
    expect(
      immune.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: immune.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(immune.engine).isAttacking());
    expect(immune.state.players[1]!.security).toHaveLength(immuneSecurityBefore - 1);

    const unprotected = await attackIntoOpposingSecurityOptions({ withTakato: false, securityOptions: [BIFROST] });
    expect(observe(unprotected.engine).keywordAmount(unprotected.perm("gallantmon"), "SecurityAttack")).toBe(-1);
    const unprotectedSecurityBefore = unprotected.state.players[1]!.security.length;
    expect(
      unprotected.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: unprotected.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(unprotected.engine).isAttacking());
    expect(unprotected.state.players[1]!.security).toHaveLength(unprotectedSecurityBefore);
  });

  it("stops being affected by an opponent's ongoing -3000 DP as soon as it gains the immunity (Q6070)", async () => {
    expect(await dpAcrossLoaderLeomonDebuff({ withTakato: true })).toEqual({ opponentTurn: 9000, ownTurn: 17000 });
    expect(await dpAcrossLoaderLeomonDebuff({ withTakato: false })).toEqual({ opponentTurn: 9000, ownTurn: 9000 });
  });

  it("becomes affected by an opponent's granted -3000 DP and <Security A. -1> once it loses the immunity (Q6071)", async () => {
    const s = await attackIntoOpposingSecurityOptions({ withTakato: true, securityOptions: [BIFROST] });
    const ragnaLoardmon = s.give(0, Zone.Hand, "BT3-019");
    expect(opponentOfferedGallantmon(s)).toBe(true);
    expect(s.perm("gallantmon").currentDP).toBe(17000);
    expect(observe(s.engine).keywordAmount(s.perm("gallantmon"), "SecurityAttack")).toBe(0);

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: ragnaLoardmon.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gallantmon").topCard?.cardId === "BT3-019" && s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasRestriction(s.perm("gallantmon"), "beAffected")).toBe(false);
    expect(s.perm("gallantmon").currentDP).toBe(11000);
    expect(observe(s.engine).keywordAmount(s.perm("gallantmon"), "SecurityAttack")).toBe(0);
  });

  it("does not trigger an opponent-granted [When Attacking] effect while it is unaffected by opponent effects (Q6072)", async () => {
    expect(await memoryLostWhenAttackingAfterIceWall({ withTakato: true })).toBe(0);
    expect(await memoryLostWhenAttackingAfterIceWall({ withTakato: false })).toBe(2);
  });
});
