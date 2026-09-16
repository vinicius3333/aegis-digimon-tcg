import { describe, it, expect } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { compiled } from "./BT21-083.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const TAIKI = "BT21-083";
const XROS_HEART_DIGIMON = "BT10-008";
const PLAIN_DIGIMON = "BT1-009";

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT21-083 [Start of Main Phase] place Xros Heart Digimon under Tamer → draw + memory", () => {
  it("places Xros Heart Digimon under Tamer, draws 1, gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki", under: [{ card: "BT1-002", as: "existing" }] }],
          hand: [
            { card: XROS_HEART_DIGIMON, as: "xros" },
            { card: "BT1-009", as: "mainAction" },
          ],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const xrosId = s.inst("xros").instanceId;

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 400 && (p0?.deck.length ?? 0) !== 0; i++) await Promise.resolve();

    expect(s.perm("taiki").stack.some((c) => c.instanceId === xrosId)).toBe(true);
    expect(s.perm("taiki").stack[0]?.instanceId).toBe(xrosId);
    expect(s.perm("taiki").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
    expect(p0?.hand.length).toBe(handBefore - 1 + 1);
    expect(s.state.memory).toBe(memBefore + 1);
    expect(p0?.deck.length).toBe(0);
  });

  it("does NOT draw when no qualifying Digimon is in hand (canActivate gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki" }],
          hand: [PLAIN_DIGIMON],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(p0?.hand.length).toBe(handBefore);
    expect(s.state.memory).toBe(memBefore);
    expect(p0?.deck.length).toBe(1);
    expect(s.perm("taiki").stack.length).toBe(0);
  });

  it("runs the Start of Your Main Phase placement through the public turn lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki" }],
          hand: [
            { card: XROS_HEART_DIGIMON, as: "xros" },
            { card: "BT1-009", as: "mainAction" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          security: ["BT1-004"],
        },
        1: { deck: ["BT1-005", "BT1-006", "BT1-007"], security: ["BT1-008"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("taiki").stack.some((card) => card.instanceId === s.inst("xros").instanceId));

    expect(s.perm("taiki").stack[0]?.instanceId).toBe(s.inst("xros").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("xros").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.memory).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});

describe("BT21-083 module registration", () => {
  it("registers the played/digivolved attack watcher and security skill", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions).toHaveLength(2);
    expect(yourTurn?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    expect(yourTurn?.actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    { card: XROS_HEART_DIGIMON, canAttack: false },
    { card: "BT11-019", canAttack: true },
  ])("a newly played $card needs Rush to attack through Taiki", async ({ card, canAttack }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki" }],
          hand: [PLAIN_DIGIMON],
          deck: Array(20).fill(PLAIN_DIGIMON),
        },
        1: { security: ["BT1-085"], deck: Array(20).fill(PLAIN_DIGIMON) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.give(0, Zone.Hand, { card, as: "shoutmon" });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("shoutmon").enterFieldTurnCount).toBe(s.state.turnCount);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.perm("shoutmon").isSuspended).toBe(canAttack);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(canAttack ? 1 : 0);
    expect(s.state.players[1]!.security).toHaveLength(canAttack ? 0 : 1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not suspend for a newly played nonmatching Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TAIKI, as: "taiki" }], hand: [{ card: PLAIN_DIGIMON, as: "plain" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plain").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("plain").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("plain").isSuspended).toBe(false);
  });

  it("does not react when the opponent plays a qualifying Xros Heart Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: TAIKI, as: "taiki" }] },
      1: { hand: [{ card: XROS_HEART_DIGIMON, as: "opponentShoutmon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentShoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === XROS_HEART_DIGIMON));
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("opponentShoutmon").isSuspended).toBe(false);
  });

  it("suspends to make a newly digivolved Hero attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAIKI, as: "taiki" },
            { card: "BT21-063", as: "gumdramon" },
          ],
          hand: [{ card: "BT21-066", as: "arrester" }],
        },
        1: { security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gumdramon").permanentId,
        instanceId: s.inst("arrester").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.perm("gumdramon").isSuspended).toBe(true);
  });

  it("declining the watcher leaves Taiki and the arrived Digimon unsuspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TAIKI, as: "taiki" }], hand: [{ card: XROS_HEART_DIGIMON, as: "shoutmon" }] },
        1: { security: ["BT1-085"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("shoutmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("shoutmon").isSuspended).toBe(false);
  });

  it("plays itself from security through a completed public attack without paying cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: TAIKI, as: "taiki" }] },
      1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
    });
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();
    const taikiId = s.inst("taiki").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === taikiId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
