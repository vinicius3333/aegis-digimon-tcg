import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../cards/index.js";

/**
 * Coverage for the Phase-4 state-based-action conditions added to `GameEngine.ruleProcess`
 * (Comprehensive Rules §17-1-3): breeding non-Digimon (§17-1-3-2-3), face-down top cards
 * (§17-1-3-2-4), and excess link cards (§17-1-3-2-5). Each condition gets one scenario
 * proving the sweep corrects an illegally-constructed board, plus a negative control
 * proving a legal board is left untouched.
 *
 * The sweep is private and only reachable through the real fixpoint (`resolveTiming` calls
 * `ruleProcess()` at the start of every timing window — stack.ts:138), so every test drives
 * it by playing a cheap, effect-free vanilla Digimon (BT1-009, no effectText) purely to open
 * an OnPlay timing window; the assertions are entirely about the PRE-SEEDED illegal state,
 * not about BT1-009 itself.
 */

const TRIGGER_CARD = "BT1-009"; // vanilla Lv.3, cost 2, no effectText — pure timing-window opener.
const TRIGGER_COST = 2;

async function triggerSweep(s: EngineSetup): Promise<void> {
  s.state.memory = TRIGGER_COST;
  const trigger = s.inst("trigger");
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId });
  expect(result).toEqual({ ok: true });
  await settle();
}

describe("A4 ruleProcess — breeding non-Digimon (CR §17-1-3-2-3)", () => {
  it("trashes a Tamer illegally sitting in the breeding slot", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      // AD1-019 is a Tamer — CR §4-2-1 does not treat Tamers as Digimon, so this is a
      // violation. Digimon/DigiEgg-only gates at every legitimate breeding-entry path mean
      // this state is unreachable through normal play; it's seeded directly to prove the sweep.
      1: { breeding: { card: "AD1-019", as: "breeding" } },
    });
    const p1 = s.state.players[1] as PlayerState;
    const breedingTopId = s.perm("breeding").topCard?.instanceId;

    await triggerSweep(s);

    expect(p1.breeding).toBeUndefined();
    expect(p1.trash.some((c) => c.instanceId === breedingTopId)).toBe(true);
  });

  it("negative control: a hatched Digi-Egg in the breeding slot is untouched", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      // BT1-001 is a Digi-Egg — CR §4-2-1 treats it as a Digimon, so it is legal here.
      1: { breeding: { card: "BT1-001", as: "breeding" } },
    });
    const p1 = s.state.players[1] as PlayerState;
    const breedingPermanentId = s.perm("breeding").permanentId;
    const breedingTopId = s.perm("breeding").topCard?.instanceId;

    await triggerSweep(s);

    expect(p1.breeding?.permanentId).toBe(breedingPermanentId);
    expect(p1.trash.some((c) => c.instanceId === breedingTopId)).toBe(false);
  });
});

describe("A4 ruleProcess — face-down top card (CR §17-1-3-2-4)", () => {
  it("trashes a permanent whose top card is illegally face-down", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "perm" }] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const perm = s.perm("perm");
    perm.topCard!.faceUp = false; // illegal: a top card must be face-up.
    const permanentId = perm.permanentId;
    const topCardId = perm.topCard!.instanceId;

    await triggerSweep(s);

    expect(p1.battleArea.some((p) => p.permanentId === permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === topCardId)).toBe(true);
  });

  it("negative control: a face-down card UNDER the top card (digivolution stack) is untouched", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: {
        battleArea: [
          // face-down stack card: legal (CR §4-6-5/9).
          { card: "AD1-001", dp: 3000, as: "perm", under: [{ card: "AD1-001", as: "stacked", faceUp: false }] },
        ],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const permanentId = s.perm("perm").permanentId;
    const stackedId = s.inst("stacked").instanceId;

    await triggerSweep(s);

    expect(p1.battleArea.some((p) => p.permanentId === permanentId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === stackedId)).toBe(false);
  });
});

describe("A4 ruleProcess — excess link cards (CR §17-1-3-2-5)", () => {
  it("trashes only the linked cards beyond the effective link limit (base 1)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: {
        battleArea: [
          {
            card: "AD1-001",
            dp: 3000,
            as: "perm",
            // base limit is 1 — 2 cards are excess.
            linked: [{ card: "AD1-001", as: "kept" }, { card: "AD1-001", as: "excess1" }, { card: "AD1-001", as: "excess2" }],
          },
        ],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const permanentId = s.perm("perm").permanentId;
    const keptId = s.inst("kept").instanceId;
    const excess1Id = s.inst("excess1").instanceId;
    const excess2Id = s.inst("excess2").instanceId;

    await triggerSweep(s);

    const perm = s.perm("perm");
    expect(perm.linked.length).toBe(1);
    expect(perm.linked.some((c) => c.instanceId === keptId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === excess1Id)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === excess2Id)).toBe(true);
    // The permanent itself survives — only the excess link cards are trashed.
    expect(p1.battleArea.some((p) => p.permanentId === permanentId)).toBe(true);
  });

  it("negative control: a single linked card (within the base limit of 1) is untouched", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "perm", linked: [{ card: "AD1-001", as: "linked" }] }] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const linkedId = s.inst("linked").instanceId;

    await triggerSweep(s);

    const perm = s.perm("perm");
    expect(perm.linked.length).toBe(1);
    expect(perm.linked[0]?.instanceId).toBe(linkedId);
    expect(p1.trash.some((c) => c.instanceId === linkedId)).toBe(false);
  });
});
