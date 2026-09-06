import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT21-083.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT21-083 (Taiki Kudo) — [Start of Your Main Phase]:
//   "By placing 1 Digimon card with the [Xros Heart]/[Blue Flare]/[Hero] trait from your
//    hand under this Tamer, <Draw 1> and gain 1 memory."
//
// FAILS-WHEN-REVERTED: with BT21-083 on the battle area, firing OnStartMainPhase on
// seat 0's turn with a qualifying Digimon in hand draws 1 and gains 1 memory. Without
// the hand-written module the RawUnparsed [Your Turn] clause stays inert and the
// StartOfMainPhase GainMemory + draw actions remain absent.
//
// Two proofs:
//   1. Positive: Xros Heart Digimon in hand → draw 1 + gain 1 memory.
//   2. Negative: no qualifying Digimon in hand → no draw, no memory change.

// BT10-008 (Shoutmon) has types: ["Xros Heart"] — qualifies.
// BT1-009 (Monodramon) has types: ["Mini Dragon"] — does not qualify.
const TAIKI = "BT21-083"; // the Tamer
const XROS_HEART_DIGIMON = "BT10-008"; // Shoutmon — [Xros Heart] trait
const PLAIN_DIGIMON = "BT1-009"; // Monodramon — no qualifying trait

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
          // Taiki (Tamer) on the battle area.
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki", under: [{ card: "BT1-002", as: "existing" }] }],
          // Xros Heart Digimon in hand.
          hand: [{ card: XROS_HEART_DIGIMON, as: "xros" }],
          // Card in deck to draw.
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const xrosId = s.inst("xros").instanceId;

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0; // 1

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    // The Xros Heart card leaves hand and a draw card arrives — net hand change is 0.
    // deck goes from 1 to 0.
    for (let i = 0; i < 400 && (p0?.deck.length ?? 0) !== 0; i++) await Promise.resolve();

    // The Xros Heart card should now be under the Tamer (in its stack).
    expect(s.perm("taiki").stack.some((c) => c.instanceId === xrosId)).toBe(true);
    expect(s.perm("taiki").stack[0]?.instanceId).toBe(xrosId);
    expect(s.perm("taiki").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
    // Hand changed: lost 1 (placed under Tamer) + gained 1 (draw) = net 0.
    expect(p0?.hand.length).toBe(handBefore - 1 + 1);
    // Memory gained by 1.
    expect(s.state.memory).toBe(memBefore + 1);
    // Deck is now empty (draw consumed the 1 card).
    expect(p0?.deck.length).toBe(0);
  });

  it("does NOT draw when no qualifying Digimon is in hand (canActivate gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, dp: 0, as: "taiki" }],
          // Only a plain Digimon (no Xros Heart/Blue Flare/Hero) in hand.
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

    // No change: the canActivate gate should fail (no qualifying card in hand).
    expect(p0?.hand.length).toBe(handBefore);
    expect(s.state.memory).toBe(memBefore);
    expect(p0?.deck.length).toBe(1);
    expect(s.perm("taiki").stack.length).toBe(0);
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

  it("suspends to make a newly played Xros Heart Digimon attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TAIKI, as: "taiki" }], hand: [{ card: XROS_HEART_DIGIMON, as: "shoutmon" }] },
        1: { security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.perm("shoutmon").isSuspended).toBe(true);
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
    expect(s.perm("taiki").isSuspended).toBe(false);
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
    await settle(() => s.state.players[1]!.security.length === 0);

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
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("shoutmon").isSuspended).toBe(false);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: TAIKI, as: "taiki" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("taiki"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
