import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-018 LordKnightmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-018");
    const compiled = registeredCompiledCards.get("AD1-018") ?? getCompiledCard("AD1-018");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-018");
    expect(definition?.nameEn).toBe("LordKnightmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("de-digivolves an opposing Digimon by two when a Knightmon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-018", as: "lord" }], hand: [{ card: "BT18-069", as: "knight" }] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("resets the Knightmon watcher on the next real turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-018", as: "lord" }],
          hand: [
            { card: "ST13-12", as: "first" },
            { card: "ST13-12", as: "same-turn" },
            { card: "ST13-12", as: "next-turn" },
          ],
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
            { card: "BT1-020", as: "first-host", under: ["BT1-010", "BT1-015"] },
            { card: "BT1-020", as: "second-host", under: ["BT1-010", "BT1-015"] },
          ],
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
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.turnSeat = 0;
    s.state.memory = 30;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("first-host").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("first-host").stack.length === 0);
    expect(s.perm("second-host").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("same-turn").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("second-host").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("second-host").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("next-turn").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("second-host").stack.length === 0);
    expect(s.perm("second-host").stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("triggers its own Knightmon-text watcher when LordKnightmon is played (Q6094)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-018", as: "lord" }] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("reduces its play cost by 5 with four Knightmon/Lucemon-text cards in trash", async () => {
    const s = setupEngine({
      0: {
        trash: ["AD1-018", "AD1-018", "AD1-018", "AD1-018"],
        hand: [{ card: "AD1-018", as: "lord" }],
      },
    });
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-018"));
    expect(s.state.memory).toBe(1);
  });

  it("grants one chosen Digimon opponent-Digimon-effect immunity through their turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-018", as: "lord" }], battleArea: [{ card: "BT1-010", as: "protected" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle();
    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, restriction: string, sourceKind?: string): boolean };
      }
    ).continuous;
    await settle(() => continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon"));
    expect(continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon")).toBe(true);
  });

  it("de-digivolves before deleting the promoted low-cost attacker from security (Q6095)", async () => {
    const s = setupEngine(
      {
        0: { security: ["AD1-018"] },
        1: { battleArea: [{ card: "AD1-001", as: "attacker", under: ["BT1-010"] }] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("security de-digivolves first, then deletes only a resulting play-cost 3 or less Digimon", async () => {
    const qualified = setupEngine({
      0: { security: [{ card: "AD1-018", as: "security" }] },
      1: { battleArea: [{ card: "BT1-015", as: "qualified", under: ["BT1-010"] }] },
    });
    qualified.state.turnSeat = 1;
    await qualified.ready();
    expect(
      qualified.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: qualified.perm("qualified").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => qualified.state.players[1]!.battleArea.length === 0);
    expect(qualified.state.players[1]!.battleArea).toHaveLength(0);

    const boundary = setupEngine({
      0: { security: [{ card: "AD1-018", as: "security" }] },
      1: { battleArea: [{ card: "BT1-015", as: "too-expensive", dp: 20000 }] },
    });
    boundary.state.turnSeat = 1;
    await boundary.ready();
    expect(
      boundary.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: boundary.perm("too-expensive").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(boundary.state.players[1]!.battleArea).toHaveLength(1);
    expect(boundary.perm("too-expensive").topCard.cardId).toBe("BT1-015");
  });
});

type Setup = ReturnType<typeof setupEngine>;

const opponentDeck = Array.from({ length: 10 }, () => "BT1-009");

function setupProtectionBoard(board: BoardSpec): { s: Setup; preferred: string[] } {
  const preferred: string[] = [];
  const s = setupEngine(board, { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred });
  return { s, preferred };
}

function preferTarget(s: Setup, preferred: string[], alias: string): void {
  preferred.splice(0, preferred.length, s.perm(alias).topCard!.instanceId);
}

async function protectWithLordKnightmon(s: Setup, preferred: string[], alias: string): Promise<void> {
  preferTarget(s, preferred, alias);
  s.state.memory = 11;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).hasRestriction(s.perm(alias), "beAffected", "Digimon"));
  expect(observe(s.engine).hasRestriction(s.perm(alias), "beAffected", "Digimon")).toBe(true);
}

async function playAs(s: Setup, seat: 0 | 1, alias: string): Promise<void> {
  s.state.turnSeat = seat;
  s.state.memory = 20;
  expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
  await settle();
}

function opponentTargetCandidates(s: Setup): string[] {
  return s.decisions
    .filter(({ seat, req }) => seat === 1 && req.kind === "chooseTargets")
    .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
}

function wasOfferedToOpponent(s: Setup, alias: string): boolean {
  const ids = [s.perm(alias).permanentId, s.perm(alias).topCard!.instanceId];
  return opponentTargetCandidates(s).some((id) => ids.includes(id));
}

async function attackPlayer(s: Setup, alias: string): Promise<void> {
  s.state.turnSeat = 0;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(alias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking());
}

describe("AD1-018 LordKnightmon — KB Q&A rulings", () => {
  it("keeps the protected Digimon from being suspended or losing DP to opponent Digimon effects (Q6088)", async () => {
    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "AD1-018", as: "lord" }],
        battleArea: [
          { card: "BT1-013", as: "protected" },
          { card: "BT1-013", as: "unprotected" },
        ],
      },
      1: {
        hand: [
          { card: "BT1-070", as: "kuwagamon" },
          { card: "BT1-055", as: "angemon" },
          { card: "BT1-055", as: "control-angemon" },
        ],
      },
    });
    await s.ready();
    await protectWithLordKnightmon(s, preferred, "protected");

    preferTarget(s, preferred, "protected");
    await playAs(s, 1, "kuwagamon");
    await playAs(s, 1, "angemon");
    expect(s.perm("protected").isSuspended).toBe(false);
    expect(s.perm("protected").currentDP).toBe(5000);
    expect(s.perm("unprotected").isSuspended).toBe(false);
    expect(s.perm("unprotected").currentDP).toBe(5000);

    preferTarget(s, preferred, "unprotected");
    await playAs(s, 1, "control-angemon");
    expect(s.perm("unprotected").currentDP).toBe(2000);
  });

  it("lets the opponent choose the protected Digimon for a suspend effect, which then does nothing (Q6089)", async () => {
    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "AD1-018", as: "lord" }],
        battleArea: [
          { card: "BT1-013", as: "protected" },
          { card: "BT1-013", as: "unprotected" },
        ],
      },
      1: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
    });
    await s.ready();
    await protectWithLordKnightmon(s, preferred, "protected");

    preferTarget(s, preferred, "protected");
    await playAs(s, 1, "kuwagamon");

    expect(wasOfferedToOpponent(s, "protected")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(0);
  });

  it("can be given Security Attack -1 by an opponent Digimon but does not count as having it (Q6090)", async () => {
    async function attackAfterShoemon(protect: boolean) {
      const { s, preferred } = setupProtectionBoard({
        0: {
          hand: [{ card: "AD1-018", as: "lord" }],
          battleArea: [
            { card: "BT1-013", as: "attacker" },
            { card: "BT1-013", as: "bystander" },
          ],
        },
        1: { hand: [{ card: "P-134", as: "shoemon" }], security: ["BT1-009", "BT1-009"] },
      });
      await s.ready();
      if (protect) await protectWithLordKnightmon(s, preferred, "attacker");
      preferTarget(s, preferred, "attacker");
      await playAs(s, 1, "shoemon");
      const offered = wasOfferedToOpponent(s, "attacker");
      const securityAttack = observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack");
      await attackPlayer(s, "attacker");
      return { offered, securityAttack, remainingSecurity: s.state.players[1]!.security.length };
    }

    expect(await attackAfterShoemon(true)).toEqual({ offered: true, securityAttack: 0, remainingSecurity: 1 });
    expect(await attackAfterShoemon(false)).toEqual({ offered: true, securityAttack: -1, remainingSecurity: 2 });
  });

  it("stops an existing opponent DP reduction as soon as the Digimon gains the immunity (Q6091)", async () => {
    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "AD1-018", as: "lord" }],
        battleArea: [{ card: "BT1-013", as: "reduced", dp: 9000 }],
      },
      1: { hand: [{ card: "BT15-041", as: "babamon" }] },
    });
    await s.ready();
    preferTarget(s, preferred, "reduced");
    await playAs(s, 1, "babamon");
    expect(s.perm("reduced").currentDP).toBe(3000);

    s.state.turnSeat = 0;
    await protectWithLordKnightmon(s, preferred, "reduced");
    await settle(() => s.perm("reduced").currentDP === 9000);
    expect(s.perm("reduced").currentDP).toBe(9000);
  });

  it("applies an opponent effect given during the immunity once the immunity ends (Q6092)", async () => {
    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "AD1-018", as: "lord" }],
        battleArea: [{ card: "BT1-013", as: "protected", dp: 9000 }],
        deck: opponentDeck,
      },
      1: { hand: [{ card: "BT15-041", as: "babamon" }], deck: opponentDeck },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await protectWithLordKnightmon(s, preferred, "protected");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    preferTarget(s, preferred, "protected");
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("babamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-041"));
    await settle();
    expect(s.perm("protected").currentDP).toBe(9000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasRestriction(s.perm("protected"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("protected").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger a given [When Attacking] effect while the Digimon is unaffected (Q6093)", async () => {
    async function memoryAfterAttack(protect: boolean): Promise<number> {
      const { s, preferred } = setupProtectionBoard({
        0: {
          hand: [{ card: "AD1-018", as: "lord" }],
          battleArea: [
            { card: "BT1-013", as: "attacker" },
            { card: "BT1-013", as: "same-level-bystander" },
          ],
        },
        1: { hand: [{ card: "EX4-018", as: "mailbirdramon" }], security: ["BT1-009"] },
      });
      await s.ready();
      if (protect) await protectWithLordKnightmon(s, preferred, "attacker");
      preferTarget(s, preferred, "attacker");
      await playAs(s, 1, "mailbirdramon");
      expect(wasOfferedToOpponent(s, "attacker")).toBe(true);
      await attackPlayer(s, "attacker");
      expect(s.state.players[1]!.security).toHaveLength(0);
      return s.state.memory;
    }

    expect(await memoryAfterAttack(true)).toBe(10);
    expect(await memoryAfterAttack(false)).toBe(8);
  });

  it("treats a card with [Knightmon] in its name or its effect text as having [Knightmon] in its text (Q6096)", async () => {
    async function opponentSourcesAfterPlaying(cardId: string): Promise<number> {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "AD1-018", as: "lord" }], hand: [{ card: cardId, as: "played" }] },
          1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      return s.perm("opponent").stack.length;
    }

    const darkKnightmonNameOnly = "BT7-063";
    const darkMaildramonEffectTextOnly = "EX4-042";
    const muchomonWithoutKnightmon = "BT1-013";
    expect(getCardDefinition(darkKnightmonNameOnly)?.nameEn).toBe("DarkKnightmon");
    expect(getCardDefinition(darkMaildramonEffectTextOnly)?.nameEn).not.toContain("Knightmon");
    expect(getCardDefinition(darkMaildramonEffectTextOnly)?.effectText).toContain("[Knightmon]");

    expect(await opponentSourcesAfterPlaying(darkKnightmonNameOnly)).toBe(0);
    expect(await opponentSourcesAfterPlaying(darkMaildramonEffectTextOnly)).toBe(0);
    expect(await opponentSourcesAfterPlaying(muchomonWithoutKnightmon)).toBe(2);
  });

  it("lets the player choose the order of its simultaneous [On Play] and [All Turns] effects (Q6915)", async () => {
    async function resolveWithFirst(timing: "OnPlay" | "AllTurns") {
      const s = setupEngine(
        {
          0: { hand: [{ card: "AD1-018", as: "lord" }], battleArea: [{ card: "BT1-013", as: "ally" }] },
          1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
        },
        { autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();
      s.state.memory = 11;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const orderRequest = s.decisions.find(({ req }) => req.kind === "orderTriggers");
      expect(orderRequest?.seat).toBe(0);
      const timings = orderRequest!.req.options?.triggerTimings ?? [];
      expect(timings).toEqual(expect.arrayContaining(["OnPlay", "AllTurns"]));
      const chosenKey = orderRequest!.req.options!.triggerKeys![timings.indexOf(timing)]!;
      const eventsBeforeResolution = s.events.length;

      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: orderRequest!.req.decisionId,
          response: { kind: "orderTriggers", order: [chosenKey] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("opponent").stack.length === 0);
      await settle();

      const resolutionEvents = s.events.slice(eventsBeforeResolution).map((event) => event.kind);
      const firstResolved = resolutionEvents.indexOf("effectResolved");
      const deDigivolvedFirst = resolutionEvents.slice(0, firstResolved).includes("cardsMoved");
      return {
        firstEffect: deDigivolvedFirst ? "deDigivolve" : "immunity",
        opponentSources: s.perm("opponent").stack.length,
        resolvedEffects: resolutionEvents.filter((kind) => kind === "effectResolved").length,
      };
    }

    expect(await resolveWithFirst("AllTurns")).toEqual({
      firstEffect: "deDigivolve",
      opponentSources: 0,
      resolvedEffects: 2,
    });
    expect(await resolveWithFirst("OnPlay")).toEqual({
      firstEffect: "immunity",
      opponentSources: 0,
      resolvedEffects: 2,
    });
  });
});
