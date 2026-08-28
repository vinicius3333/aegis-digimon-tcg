import { describe, it, expect } from "vitest";
import { EffectDuration, type PlayerState } from "@aegis/shared";
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
  it("trashes only the linked cards beyond the effective link limit (base 1), and the owner picks which", async () => {
    // Q6370 (BT25-075): "The link cards to trash are chosen by the player." The RULE fixes
    // the count (down to the limit); the controller names the cards, so this test answers
    // the prompt and asserts its own pick — see the sibling test for a pick that is NOT the
    // tail of `linked`, which is what the sweep used to trim blindly.
    const s = setupEngine(
      {
        0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
        1: {
          battleArea: [
            {
              card: "AD1-001",
              dp: 3000,
              as: "perm",
              // base limit is 1 — 2 cards are excess.
              linked: [
                { card: "AD1-001", as: "kept" },
                { card: "AD1-001", as: "excess1" },
                { card: "AD1-001", as: "excess2" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const permanentId = s.perm("perm").permanentId;
    const keptId = s.inst("kept").instanceId;
    const excess1Id = s.inst("excess1").instanceId;
    const excess2Id = s.inst("excess2").instanceId;
    await triggerSweep(s);

    const perm = s.perm("perm");
    expect(perm.linked.length).toBe(1);
    expect(p1.trash.filter((c) => [keptId, excess1Id, excess2Id].includes(c.instanceId)).length).toBe(2);
    // The permanent itself survives — only the excess link cards are trashed.
    expect(p1.battleArea.some((p) => p.permanentId === permanentId)).toBe(true);
  });

  it("Q6370: the controller's pick is honored, not the tail of the link list", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
        1: {
          battleArea: [
            {
              card: "AD1-001",
              dp: 3000,
              as: "perm",
              linked: [
                { card: "AD1-001", as: "first" },
                { card: "AD1-001", as: "second" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    const p1 = s.state.players[1] as PlayerState;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    // Answer the sweep's prompt with the FIRST link card — the one a tail trim would keep.
    prefer.push(firstId);

    await triggerSweep(s);

    const perm = s.perm("perm");
    expect(perm.linked.map((c) => c.instanceId)).toEqual([secondId]);
    expect(p1.trash.some((c) => c.instanceId === firstId)).toBe(true);
  });

  it("Q6370: a forced trim — every link card is excess — resolves without asking", async () => {
    // Limit 0 with 1 linked card: the count the rule demands equals the whole candidate set,
    // so there is nothing for the controller to decide and no prompt is opened. A limit of 0
    // needs a negative <Link> delta, which no printed card grants, so it is seeded on the
    // ledger directly (the same reach ch10-link.test.ts uses to cancel a printed <Link +1>).
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "perm", linked: [{ card: "AD1-001", as: "linked" }] }] },
    });
    const p1 = s.state.players[1] as PlayerState;
    const linkedId = s.inst("linked").instanceId;
    (
      s.engine as unknown as {
        continuous: { addLinkMaxGrant(id: string, delta: number, duration: EffectDuration): void };
      }
    ).continuous.addLinkMaxGrant(s.perm("perm").permanentId, -1, EffectDuration.UntilEachTurnEnd);

    await triggerSweep(s);

    expect(s.perm("perm").linked).toHaveLength(0);
    expect(p1.trash.some((c) => c.instanceId === linkedId)).toBe(true);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
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
