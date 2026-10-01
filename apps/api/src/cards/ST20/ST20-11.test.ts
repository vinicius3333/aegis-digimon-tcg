import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-055.js";
import "../BT1/BT1-070.js";
import "../EX4/EX4-018.js";
import "./ST20-05.js";
import "./ST20-11.js";
import "./ST20-12.js";
import "./ST20-13.js";

describe("ST20-11 WarGreymon", () => {
  it("plays, protects one Digimon per two Tamer colors, and deletes the lowest DP target when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "protected" }, "ST20-12", "BT21-102"],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST20-11"));
    await s.engine.recomputeContinuousEffects();

    const warGreymon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST20-11")!;
    await advance(s.engine).fire(EffectTiming.OnPlay, warGreymon);
    await s.engine.recomputeContinuousEffects();
    const engine = s.engine as unknown as {
      buildEffectContext: (
        source: unknown,
        trigger: unknown,
      ) => { fx: { isBeAffectedBySourceKind?: (id: string, kind: string) => boolean } };
      cardSourceOf: (card: unknown) => unknown;
    };
    const context = engine.buildEffectContext(engine.cardSourceOf(warGreymon.topCard), {});
    const digimonIds = s.state.players[0]!.battleArea.filter(
      (perm) => perm.topCard.cardId === "ST20-07" || perm.topCard.cardId === "ST20-11",
    ).map((perm) => perm.permanentId);
    expect(digimonIds.filter((id) => !context.fx.isBeAffectedBySourceKind?.(id, "Digimon"))).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, warGreymon);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("Blast Digivolves from hand at Counter Timing without memory cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "ST20-04", as: "base" }],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("wargreymon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST20-11");

    expect(s.perm("base").topCard.cardId).toBe("ST20-11");
    expect(s.state.memory).toBe(0);
  });
});

const INERT_DECK = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

type WarGreymonSetup = ReturnType<typeof setupEngine>;

function setupWarGreymonBoard(options: {
  tamers?: string[];
  opponentHand?: string[];
  opponentSecurity?: string[];
  extraDigimon?: boolean;
}) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          ...(options.tamers ?? ["ST20-12"]),
          { card: "BT1-009", as: "guarded", dp: 6000 },
          ...(options.extraDigimon === false ? [] : [{ card: "BT1-009", as: "exposed", dp: 6000 }]),
        ],
        hand: [{ card: "ST20-11", as: "wargreymon" }],
        deck: INERT_DECK,
      },
      1: {
        hand: (options.opponentHand ?? []).map((card, index) => ({ card, as: `opponentCard${index}` })),
        security: options.opponentSecurity ?? ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: INERT_DECK,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  return { s, preferred };
}

function prefer(preferred: string[], ...instanceIds: string[]) {
  preferred.length = 0;
  preferred.push(...instanceIds);
}

async function playWarGreymon(s: WarGreymonSetup) {
  s.state.turnSeat = 0;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("wargreymon").instanceId) &&
      s.state.pendingDecision === undefined,
  );
  await s.engine.recomputeContinuousEffects();
}

async function opponentPlays(s: WarGreymonSetup, alias: string) {
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst(alias).instanceId) &&
      s.state.pendingDecision === undefined,
  );
  await s.engine.recomputeContinuousEffects();
}

async function attackPlayer(s: WarGreymonSetup, alias: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(alias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());
  await advance(s.engine).finishAttack();
}

function isGuardedFromOpponentDigimon(s: WarGreymonSetup, alias: string) {
  return observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon");
}

describe("ST20-11 WarGreymon — KB Q&A rulings", () => {
  it.each([
    { tamers: ["ST20-12"], protectedCount: 1 },
    { tamers: ["ST20-12", "ST20-13"], protectedCount: 2 },
  ])(
    "protects $protectedCount Digimon for Tamers $tamers until the opponent's turn ends (Q4457)",
    async ({ tamers, protectedCount }) => {
      const { s, preferred } = setupWarGreymonBoard({ tamers });
      prefer(preferred, s.perm("guarded").topCard.instanceId, s.perm("exposed").topCard.instanceId);
      await playWarGreymon(s);

      const digimonAliases = ["guarded", "exposed", "wargreymon"] as const;
      const protectedAliases = digimonAliases.filter((alias) =>
        alias === "wargreymon"
          ? observe(s.engine).isRestrictedByEffect(
              s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST20-11")!,
              "beAffected",
              "Digimon",
            )
          : isGuardedFromOpponentDigimon(s, alias),
      );
      expect(protectedAliases).toEqual(["guarded", "exposed"].slice(0, protectedCount));

      s.state.turnSeat = 1;
      s.state.memory = 0;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(false);
    },
  );

  it.each([
    { effect: "suspend", card: "BT1-070", target: "guarded", affected: false },
    { effect: "suspend", card: "BT1-070", target: "exposed", affected: true },
    { effect: "-3000 DP", card: "BT1-055", target: "guarded", affected: false },
    { effect: "-3000 DP", card: "BT1-055", target: "exposed", affected: true },
  ] as const)(
    "an opponent's Digimon $effect effect choosing the $target Digimon affects it: $affected (Q4458)",
    async ({ card, target, affected }) => {
      const { s, preferred } = setupWarGreymonBoard({ opponentHand: [card] });
      prefer(preferred, s.perm("guarded").topCard.instanceId);
      await playWarGreymon(s);
      expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(true);
      const baseDP = s.perm(target).currentDP;

      prefer(preferred, s.perm(target).topCard.instanceId);
      await opponentPlays(s, "opponentCard0");

      const observed =
        card === "BT1-070" ? { suspended: s.perm(target).isSuspended } : { dp: s.perm(target).currentDP };
      expect(observed).toEqual(
        card === "BT1-070" ? { suspended: affected } : { dp: affected ? baseDP - 3000 : baseDP },
      );
    },
  );

  it("offers the protected Digimon as a legal choice for the opponent's suspend effect (Q4459)", async () => {
    const { s, preferred } = setupWarGreymonBoard({ opponentHand: ["BT1-070"] });
    prefer(preferred, s.perm("guarded").topCard.instanceId);
    await playWarGreymon(s);
    const decisionsBefore = s.decisions.length;

    await opponentPlays(s, "opponentCard0");

    const suspendChoice = s.decisions
      .slice(decisionsBefore)
      .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets" && req.sourceCardId === "BT1-070");
    expect(suspendChoice?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("guarded").permanentId, s.perm("exposed").permanentId]),
    );
    expect(s.perm("guarded").isSuspended).toBe(false);
    expect(s.perm("exposed").isSuspended).toBe(false);
  });

  it("can be given <Security A. -1> while protected, but does not count as having it (Q4460)", async () => {
    const { s, preferred } = setupWarGreymonBoard({
      opponentSecurity: ["ST20-05", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
    });
    s.putOnBoard(0, { card: "BT1-009", as: "opener" });
    prefer(preferred, s.perm("guarded").topCard.instanceId);
    await playWarGreymon(s);

    prefer(preferred, s.perm("guarded").topCard.instanceId, s.perm("exposed").topCard.instanceId);
    await attackPlayer(s, "opener");
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST20-05"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("guarded"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("exposed"), "SecurityAttack")).toBe(-1);

    const securityBefore = s.state.players[1]!.security.length;
    await attackPlayer(s, "guarded");
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
    await attackPlayer(s, "exposed");
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });

  it("stops an opponent's <Security A. -1> already applying once the Digimon gains the protection (Q4461)", async () => {
    const { s, preferred } = setupWarGreymonBoard({ opponentHand: ["ST20-05"] });
    prefer(preferred, s.perm("guarded").topCard.instanceId, s.perm("exposed").topCard.instanceId);
    await opponentPlays(s, "opponentCard0");
    expect(observe(s.engine).keywordAmount(s.perm("guarded"), "SecurityAttack")).toBe(-1);

    prefer(preferred, s.perm("guarded").topCard.instanceId);
    await playWarGreymon(s);
    expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(true);
    expect(isGuardedFromOpponentDigimon(s, "exposed")).toBe(false);

    const securityBefore = s.state.players[1]!.security.length;
    await attackPlayer(s, "guarded");
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
    await attackPlayer(s, "exposed");
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });

  it("applies an effect given while protected as soon as the protection ends (Q4462)", async () => {
    const { s, preferred } = setupWarGreymonBoard({ opponentHand: ["ST20-05", "BT1-009"] });
    prefer(preferred, s.perm("guarded").topCard.instanceId);
    await playWarGreymon(s);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    prefer(preferred, s.perm("guarded").topCard.instanceId, s.perm("exposed").topCard.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentCard0").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST20-05") &&
        s.state.pendingDecision === undefined,
    );
    expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("guarded"), "SecurityAttack")).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("guarded"), "SecurityAttack")).toBe(-1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const securityBefore = s.state.players[1]!.security.length;
    await attackPlayer(s, "guarded");
    expect(s.state.players[1]!.security).toHaveLength(securityBefore);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it.each([
    { protectedAlias: "guarded", memoryLost: 0 },
    { protectedAlias: "wargreymon", memoryLost: 2 },
  ] as const)(
    "a gained [When Attacking] effect does not trigger while the attacker is protected ($protectedAlias protected) (Q4696)",
    async ({ protectedAlias, memoryLost }) => {
      const { s, preferred } = setupWarGreymonBoard({ opponentHand: ["EX4-018"], extraDigimon: false });
      await opponentPlays(s, "opponentCard0");

      prefer(preferred, s.inst(protectedAlias === "guarded" ? "guarded" : "wargreymon").instanceId);
      await playWarGreymon(s);
      expect(isGuardedFromOpponentDigimon(s, "guarded")).toBe(protectedAlias === "guarded");

      const memoryBefore = s.state.memory;
      await attackPlayer(s, "guarded");
      expect(memoryBefore - s.state.memory).toBe(memoryLost);
    },
  );
});
