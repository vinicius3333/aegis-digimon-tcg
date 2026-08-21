import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

// A3 for BT21-058 (Snatchmon) — [On Play] / [When Digivolving]:
//   "Reveal the top 3 cards of your deck. Add 1 card with [Vemmon] in its text to your
//    hand. Trash the rest. Then, you may place up to 2 [Vemmon] from your trash as 1 of
//    your Digimon's bottom digivolution cards."
//
// FAILS-WHEN-REVERTED: with BT21-058 on the field, firing OnPlay with a deck containing
// a [Vemmon] card draws it to hand. Without the hand-written module the RawUnparsed
// inherited clause + the plain onPlay/WhenDigivolving actions from the IR remain
// but the reveal-and-add logic is absent.
//
// We test the [On Play] path because it's the most stable to drive directly.

const SNATCHMON = "BT21-058";
const VEMMON_CARD = "BT21-056"; // BT21 Vemmon — nameEn: "Vemmon"
const VEMMON_IN_EFFECT_TEXT = "BT11-065"; // Snatchmon — mentions [Vemmon], but name/types do not.
const PLAIN_CARD = "BT1-009"; // Agumon-like — no "Vemmon" in text

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT21-058 [On Play] reveal-3 adds [Vemmon]-in-text card to hand", () => {
  it("adds the Vemmon card to hand and trashes the non-Vemmon cards", async () => {
    // Put Snatchmon on the battle area so its OnPlay fires.
    // Deck: [Vemmon, plain, plain] (Vemmon is at top).
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SNATCHMON, dp: 7000, as: "snatchmon" }],
          deck: [
            { card: VEMMON_CARD, as: "vemmon" },
            { card: PLAIN_CARD, as: "plain1" },
            { card: PLAIN_CARD, as: "plain2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const snatchmonId = s.perm("snatchmon").permanentId;
    const vemmonId = s.inst("vemmon").instanceId;
    const plain1Id = s.inst("plain1").instanceId;
    const plain2Id = s.inst("plain2").instanceId;

    const handBefore = p0?.hand.length ?? 0;
    const trashBefore = p0?.trash.length ?? 0;

    await fireTiming(s, EffectTiming.OnPlay, {
      subjectPermanentId: snatchmonId,
    });
    for (let i = 0; i < 400 && !((p0?.hand.length ?? 0) > handBefore || (p0?.trash.length ?? 0) > trashBefore); i++)
      await Promise.resolve();

    // The Vemmon card should be in hand (added from revealed 3).
    expect(p0?.hand.some((c) => c.instanceId === vemmonId)).toBe(true);
    // The 2 non-Vemmon cards should be in trash.
    expect(p0?.trash.some((c) => c.instanceId === plain1Id)).toBe(true);
    expect(p0?.trash.some((c) => c.instanceId === plain2Id)).toBe(true);
    // Deck is now empty.
    expect(p0?.deck.length).toBe(0);
  });

  it("does NOT add to hand when no [Vemmon]-in-text card is in the revealed 3", async () => {
    // Deck: [plain, plain, plain] — no Vemmon.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SNATCHMON, dp: 7000, as: "snatchmon" }],
          deck: [PLAIN_CARD, PLAIN_CARD, PLAIN_CARD],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const snatchmonId = s.perm("snatchmon").permanentId;

    const handBefore = p0?.hand.length ?? 0;

    await fireTiming(s, EffectTiming.OnPlay, {
      subjectPermanentId: snatchmonId,
    });
    for (let i = 0; i < 400 && (p0?.trash.length ?? 0) < 3; i++) await Promise.resolve();

    // No card added to hand.
    expect(p0?.hand.length).toBe(handBefore);
    // All 3 trashed.
    expect(p0?.trash.length).toBe(3);
  });

  it("recognizes a card whose printed effect text mentions [Vemmon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SNATCHMON, dp: 7000, as: "snatchmon" }],
          deck: [{ card: VEMMON_IN_EFFECT_TEXT, as: "vemmonInText" }, PLAIN_CARD, PLAIN_CARD],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const snatchmonId = s.perm("snatchmon").permanentId;
    const qualifyingId = s.inst("vemmonInText").instanceId;

    await fireTiming(s, EffectTiming.OnPlay, { subjectPermanentId: snatchmonId });
    for (let i = 0; i < 400 && !p0?.hand.some((c) => c.instanceId === qualifyingId); i++) {
      await Promise.resolve();
    }

    expect(p0?.hand.some((c) => c.instanceId === qualifyingId)).toBe(true);
  });

  it("deletes only an opposing play-cost-4-or-less Digimon when this stack returns Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-009",
              as: "host",
              under: [{ card: SNATCHMON }, { card: VEMMON_CARD, as: "stackedVemmon" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: PLAIN_CARD, as: "eligible" },
            { card: "BT1-010", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const tooExpensiveId = s.perm("tooExpensive").permanentId;

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await advance(s.engine).verb.returnToDeck([s.inst("stackedVemmon").instanceId], {
      toTop: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(s.state.players[1]?.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]?.battleArea.some((p) => p.permanentId === tooExpensiveId)).toBe(true);
  });
});
