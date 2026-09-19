import { describe, expect, it } from "vitest";
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

function eventIndex(s: ReturnType<typeof setupEngine>, kind: string): number {
  return s.events.findIndex((event) => event.kind === kind);
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
});
