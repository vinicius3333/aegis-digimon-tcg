import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/index.js";

const BLACK_WAR_GREYMON = "EX10-010";
const BASE_L5 = "BT1-024";
const COST_7 = "BT10-065";
const COST_8 = "BT12-069";
const YUUKO = "BT22-083";
const GRAP_LEOMON = "BT25-016";
const LEOPARDMON = "BT22-052";
const GREEN_BASE_L5 = "BT3-053";
const SMALL_L3 = "BT1-013";
const ON_DELETION_LEOMON = "BT1-035";

function eventIndex(s: ReturnType<typeof setupEngine>, kind: string): number {
  return s.events.findIndex((event) => event.kind === kind);
}

type FireTiming = (timing: EffectTiming, trigger?: unknown) => Promise<void>;

/**
 * Read something at the exact moment the attack reaches End of Attack. §11-1-4 puts the steps'
 * own triggers — a battle deletion's [On Deletion] above all — before that timing, so whatever
 * they produce must already be visible here. An effect-directed attack used to park those
 * windows behind the ordering effect's still-open window token and flush them only once the
 * whole attack had ended, which this reading distinguishes.
 */
function captureAtEndOfAttack<T>(s: ReturnType<typeof setupEngine>, read: () => T): { value: T | undefined } {
  const captured: { value: T | undefined } = { value: undefined };
  const hooks = (s.engine as unknown as { combat: { hooks: { fireTiming: FireTiming } } }).combat.hooks;
  const original = hooks.fireTiming.bind(hooks);
  hooks.fireTiming = async (timing, trigger) => {
    if (timing === EffectTiming.OnEndAttack && captured.value === undefined) captured.value = read();
    return original(timing, trigger);
  };
  return captured;
}

describe("attack steps wait for pending effects", () => {
  it("resolves a Blast Digivolve's [When Digivolving] before the block window opens", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_L5, as: "base" }],
          hand: [{ card: BLACK_WAR_GREYMON, as: "ace" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: COST_8, as: "attacker" },
            { card: COST_7, as: "cost7", suspended: true },
          ],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("cost7").permanentId);
    const aceInstanceId = s.inst("ace").instanceId;
    const basePermanentId = s.perm("base").permanentId;
    const cost7Id = s.perm("cost7").permanentId;

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: aceInstanceId,
        effectKey: `blast-digivolve:${basePermanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.events.some((event) => event.kind === "blockWindowOpened") || !observe(s.engine).isAttacking(),
    );

    const blockOpened = eventIndex(s, "blockWindowOpened");
    expect(blockOpened).toBeGreaterThan(-1);
    const whenDigivolvingResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && JSON.stringify(event).includes(BLACK_WAR_GREYMON),
    );
    expect(whenDigivolvingResolved).toBeGreaterThan(-1);
    expect(whenDigivolvingResolved).toBeLessThan(blockOpened);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cost7Id)).toBe(false);
  });

  it("resolves a 'when the attack target switches' watcher before the battle resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BLACK_WAR_GREYMON, as: "blocker", dp: 12000 },
            { card: YUUKO, as: "yuuko" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "attacker", dp: 13000 }],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const combatResolved = eventIndex(s, "combatResolved");
    const yuukoResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && JSON.stringify(event).includes(YUUKO),
    );
    expect(yuukoResolved).toBeGreaterThan(-1);
    expect(yuukoResolved).toBeLessThan(combatResolved);
    // Yuuko's +3000 makes the 12000 blocker survive the 13000 attacker.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("blocker").permanentId)).toBe(true);
  });

  it("resolves a Blast Digivolve's [When Digivolving] before the block window of an effect-directed attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_L5, as: "base" }],
          hand: [{ card: BLACK_WAR_GREYMON, as: "ace" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: COST_8, as: "attacker" },
            { card: COST_7, as: "cost7", suspended: true },
          ],
          hand: [{ card: GRAP_LEOMON, as: "grap" }, "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);
    const aceInstanceId = s.inst("ace").instanceId;
    const basePermanentId = s.perm("base").permanentId;
    const cost7Id = s.perm("cost7").permanentId;

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    preferred.length = 0;
    preferred.push(cost7Id);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: aceInstanceId,
        effectKey: `blast-digivolve:${basePermanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.events.some((event) => event.kind === "blockWindowOpened") || !observe(s.engine).isAttacking(),
    );

    const blockOpened = eventIndex(s, "blockWindowOpened");
    expect(blockOpened).toBeGreaterThan(-1);
    const whenDigivolvingResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && JSON.stringify(event).includes(BLACK_WAR_GREYMON),
    );
    expect(whenDigivolvingResolved).toBeGreaterThan(-1);
    expect(whenDigivolvingResolved).toBeLessThan(blockOpened);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cost7Id)).toBe(false);
  });

  it("resolves BT22-052's [When Digivolving] play and Blocker grant before the block window of an effect-directed attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_BASE_L5, as: "base" }],
          hand: [
            { card: LEOPARDMON, as: "ace" },
            { card: SMALL_L3, as: "small" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "attacker" }],
          hand: [{ card: GRAP_LEOMON, as: "grap" }, "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);
    const aceInstanceId = s.inst("ace").instanceId;
    const smallInstanceId = s.inst("small").instanceId;
    const basePermanentId = s.perm("base").permanentId;

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    preferred.length = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: aceInstanceId,
        effectKey: `blast-digivolve:${basePermanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.events.some((event) => event.kind === "blockWindowOpened") || !observe(s.engine).isAttacking(),
    );

    const blockOpened = eventIndex(s, "blockWindowOpened");
    expect(blockOpened).toBeGreaterThan(-1);
    const whenDigivolvingResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && JSON.stringify(event).includes(LEOPARDMON),
    );
    expect(whenDigivolvingResolved).toBeGreaterThan(-1);
    expect(whenDigivolvingResolved).toBeLessThan(blockOpened);

    // The [When Digivolving] play resolved before the block window, so the freshly played
    // level 3 Digimon already holds the granted ＜Blocker＞ when the window is offered.
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === smallInstanceId);
    expect(played).toBeDefined();
    const blockEvent = s.events[blockOpened] as { eligibleBlockerIds: string[] };
    expect(blockEvent.eligibleBlockerIds).toContain(played!.permanentId);
  });

  it("resolves BT22-083's target-switch watcher before the battle of an effect-directed attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BLACK_WAR_GREYMON, as: "blocker", dp: 12000 },
            { card: YUUKO, as: "yuuko" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "attacker", dp: 13000 }],
          hand: [{ card: GRAP_LEOMON, as: "grap" }, "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);
    const endOfAttackEventCount = captureAtEndOfAttack(s, () => s.events.length);

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    preferred.length = 0;
    preferred.push(s.perm("blocker").permanentId);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const combatResolved = eventIndex(s, "combatResolved");
    expect(combatResolved).toBeGreaterThan(-1);
    const yuukoResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && JSON.stringify(event).includes(YUUKO),
    );
    expect(yuukoResolved).toBeGreaterThan(-1);
    expect(yuukoResolved).toBeLessThan(combatResolved);
    // `combatResolved` alone is too weak: it is emitted in resolveAttack's `finally`, so a Yuuko
    // that only resolved in the post-attack flush would still precede it. Pin the resolution to
    // BEFORE End of Attack, and keep the DP proof that it landed before the battle at all: the
    // +3000 is what lets the 12000 blocker survive.
    expect(endOfAttackEventCount.value).toBeDefined();
    expect(yuukoResolved).toBeLessThan(endOfAttackEventCount.value!);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("blocker").permanentId)).toBe(true);
  });

  it("activates a battle deletion's [On Deletion] before End of Attack on an effect-directed attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ON_DELETION_LEOMON, as: "leomon", suspended: true }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "attacker" }],
          hand: [{ card: GRAP_LEOMON, as: "grap" }, "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const leomonId = s.perm("leomon").permanentId;
    preferred.push(attackerId, leomonId);
    const endOfAttackMemory = captureAtEndOfAttack(s, () => s.state.memory);

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Seat 0's unsuspend phase ran before seat 1's turn, so re-suspend the defender here:
    // only a suspended Digimon is a legal attack target.
    s.perm("leomon").isSuspended = true;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === leomonId)).toBe(false);
    // BT1-035's [On Deletion] "Gain 2 memory" resolved BEFORE End of Attack: the memory read
    // at that timing already equals the final total, instead of trailing it by the 2 the
    // deletion grants (the post-attack flush the bug produced).
    expect(endOfAttackMemory.value).toBeDefined();
    expect(endOfAttackMemory.value).toBe(s.state.memory);
  });

  it("activates a battle deletion's [On Deletion] before End of Attack on a player-declared attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ON_DELETION_LEOMON, as: "leomon", suspended: true }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "attacker" }],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const leomonId = s.perm("leomon").permanentId;
    const endOfAttackMemory = captureAtEndOfAttack(s, () => s.state.memory);

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Seat 0's unsuspend phase ran before seat 1's turn, so re-suspend the defender here:
    // only a suspended Digimon is a legal attack target.
    s.perm("leomon").isSuspended = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: leomonId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === leomonId)).toBe(false);
    expect(endOfAttackMemory.value).toBeDefined();
    expect(endOfAttackMemory.value).toBe(s.state.memory);
  });
});
