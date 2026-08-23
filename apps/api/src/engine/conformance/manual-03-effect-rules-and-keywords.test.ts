import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Official Rule Manual chunks manual-0042..manual-0066 — "Effect Rules" (Effect
 * Basics, Persistent/Trigger-Type/Activation-Type/Immediate-Type Effects, Simultaneous
 * and Derived Triggering), "Card Text Rules" (Specifying Names, "with XX in its
 * text", "XX or YY", private-area placement/reveal, targeting, "isn't affected by
 * effects", changing/ending an attack, "by doing" conditions, "with different XX"),
 * "Effect Timings" (the icon glossary: On Play, Hand, Trash, Breeding, Main,
 * Security, Your/Opponent's/All Turns, Start/End of Turn, Start of Main Phase,
 * Counter, End of Attack), "Rule Checks" (A-E), and the "List of Keyword Effects and
 * Rules" (Security A./Jamming/Piercing/Rush/Blocker/Recovery/Delay/Barrier/Armor
 * Purge/Alliance/Save/Material Save/Digisorption/Partition/Fortitude/Blitz/Vortex/
 * Raid/Reboot/Ascension/De-Digivolve/Use Req./Decoy/Collision/Overflow/Fragment/DNA
 * Digivolve/DigiXros/Retaliation/Scapegoat/Execute/Digi-Burst/Assembly/Blast Digivolve/
 * Arts Digivolve/Blast DNA Digivolve/Mind Link/Link+X).
 *
 * See manual-01's file header for the shared framing. This range is, chunk for
 * chunk, the densest overlap with already-built coverage in the whole manual:
 * ch15 (Effect Rules, all four sub-files), ch04 (card-text terminology), ch16a/b/c
 * (every keyword), and ch17 (Rule Checks) between them already carry real,
 * behaviorally-verified (or honestly it.fails-documented) tests for essentially
 * every rule restated here — frequently against the manual's OWN worked examples
 * (e.g. comprehensive-0186's "1 of your opponent's Digimon with no digivolution
 * cards ... continues to be affected" is the SAME worked example as manual-0049's).
 * There is no genuinely new engine surface in this range this lane's own file
 * ownership (conformance/manual*.test.ts only) can reach — driving anything further
 * here would mean editing ch11/ch15/ch16/ch17, which are reserved. Each entry below
 * names precisely which existing test proves the SAME rule, or (where the SAME rule
 * is itself still an open gap source) says so honestly rather than implying
 * verification that doesn't exist.
 */

markNotTestable(
  "manual-0042",
  "'Unless specified otherwise, effects trigger/activate while the card is in the battle area' " +
    "and 'a Digimon in the breeding area can't be chosen' restate comprehensive-0157 (15-1-7) " +
    "and comprehensive-0184 (15-10-2, Effect Targets - Cards), already tested at " +
    "ch15-01-effect-basics.test.ts §15-1 and ch15-03-targeting-and-selection.test.ts §15-10-2.",
);

markNotTestable(
  "manual-0043",
  "Persistent Effects ('always activated as long as their conditions are met, they don't " +
    "trigger') restates comprehensive-0172, already tested at ch15-04-continuous-and-static.test" +
    ".ts §15-8-2. Trigger-Type Effects and Simultaneous Triggering (the turn player chooses their " +
    "own activation order first, then the non-turn player) restate comprehensive-0163/0164, " +
    "already tested at ch15-02-timing-and-resolution.test.ts §15-4-2/§15-4-3.",
);

markNotTestable(
  "manual-0044",
  "Derived Triggering ('a new trigger-type effect that triggers while other triggered effects " +
    "are pending activation ... activates before other effects that triggered before it') and " +
    "'a card with a pending-activation effect that leaves an area before it activates can no " +
    "longer activate it' restate comprehensive-0166 and comprehensive-0165, already tested at " +
    "ch15-02-timing-and-resolution.test.ts §15-4-5/§15-4-4.",
);

markNotTestable(
  "manual-0045",
  "Activation-Type Effects ('activated by declaring their activation ... when there are no " +
    "rules or effects that need to be processed') restates comprehensive-0176, already tested at " +
    "ch15-02-timing-and-resolution.test.ts §15-8-4. Immediate-Type Effects ('interrupt processing " +
    "immediately before the effects/conditions that caused them to trigger') restate " +
    "comprehensive-0177, already tested with a real ＜Barrier＞ card at " +
    "ch15-04-continuous-and-static.test.ts §15-8-5.",
);

markNotTestable(
  "manual-0046",
  "'If a card with a pending-activation effect leaves an area before the effect activates, the " +
    "effect can no longer be activated' restates comprehensive-0165 (ch15-02 §15-4-4, already " +
    "tested — same rule as manual-0044 above, restated with a different worked example). Card " +
    "Text Rules' 'Specifying Names' (bracketed [XX] means only exact-name matches) restates " +
    "comprehensive-0034 (2-3-1-2), already tested at ch02-card-information.test.ts §2-3-1.",
);

markNotTestable(
  "manual-0047",
  "'With XX in its text' (name/trait/effect/inherited-effect/Link/Rule/digivolution/DigiXros/DNA " +
    "text matching; an icon like ＜Material Save＞ can't be referenced by a ＜Save＞-in-text " +
    "filter because the icon differs) restates comprehensive-0092, already tested at " +
    "ch04-basic-terminology.test.ts §4-22. '\"XX or YY\" means either XX or YY' restates " +
    "comprehensive-0093, already tested at ch04 §4-23. 'Returning Revealed Cards to the Deck' " +
    "(the revealing player chooses the return order) restates comprehensive-0201/0202/0203, " +
    "already tested at ch15-03-targeting-and-selection.test.ts §15-15-3.",
);

markNotTestable(
  "manual-0048",
  "'Unless specified otherwise, a card is placed face down when placed in a private area' and " +
    '\'a card moved between private areas via text like "card with XX" is revealed to the ' +
    "opponent before placing' restate comprehensive-0201/0202/0203, already tested at " +
    "ch15-03-targeting-and-selection.test.ts §15-15-3 (Effects That Reveal Cards).",
);

markNotTestable(
  "manual-0049",
  "Effects That Choose Targets restates comprehensive-0183/0184, already tested at " +
    "ch15-03-targeting-and-selection.test.ts §15-10-1/§15-10-2. The chunk's own worked example " +
    "('1 of your opponent's Digimon with no digivolution cards can't attack or block ... even if " +
    "it later gains digivolution cards, it continues to be affected') is the EXACT SAME worked " +
    "example (same real card, BT1-100) already driven behaviorally at comprehensive-0186 " +
    "(ch15-03 §15-11-1, Individual Processing) — a card matching the CHOOSING condition once " +
    "stays affected even after it stops matching.",
);

markNotTestable(
  "manual-0050",
  "Effects That Don't Choose Targets (All/No/None — 'the effect affects all matching cards; a " +
    "continuous effect also affects targets that later enter the target area') restates " +
    "comprehensive-0187/0188, already tested at ch15-03-targeting-and-selection.test.ts §15-11-2: " +
    "this chunk's own worked example ('None of your opponent's Digimon with no digivolution cards " +
    "can attack') is the overall-processing shape BT1-100's printed text exercises, and its " +
    'compiled IR carries `target.count: "all"`, which the interpreter resolves to EVERY ' +
    "matching target with no chooseTargets prompt — driven end-to-end by comprehensive-0187's " +
    "test with this exact card.",
);

markNotTestable(
  "manual-0051",
  "Face-up Security Cards ('Security effects on such cards are activated'; 'a security stack " +
    "with face-up cards is shuffled face-down') is already tested at ch03-game-areas.test.ts and " +
    "ch15-04-continuous-and-static.test.ts (both reference face-up security card handling). " +
    "\"Isn't Affected by Effects\" ('can still gain effects and be chosen for effects, but an " +
    "already-active effect on it won't apply until it stops being immune') restates " +
    "comprehensive-0204, already tested at ch15-03-targeting-and-selection.test.ts §15-15-5.",
);

markNotTestable(
  "manual-0052",
  "\"Isn't Affected by Effects\", cont'd ('once no longer immune, it's immediately affected by " +
    "any effects it had already gained while immune') restates comprehensive-0204, already " +
    "tested at ch15-03-targeting-and-selection.test.ts §15-15-5. 'Effects That Play/Digivolve/Use " +
    "Cards' ('the cost must be paid unless the text says \"without paying the cost\"') is the " +
    "printed-cost-payment default every play/digivolve/use path already enforces (ch07/ch08/ch09) " +
    "and every 'without paying the cost' card (Blast Digivolve, App Fusion, Assembly, etc.) is " +
    "the documented exception. 'Changing an Attack Target' restates comprehensive-0242 (＜Raid＞, " +
    "the concrete keyword implementing exactly this rule), already tested and documented as an " +
    "unimplemented DIVERGENCE at ch16c-deletion-and-advanced-keywords.test.ts §16-23.",
);

markNotTestable(
  "manual-0053",
  "'Ending an Attack' ('by trashing 2 cards in your hand, end the attack; a transition occurs " +
    "straight from the attack-declaration timing to the end-of-attack timing') restates " +
    "comprehensive-0199 — which is ITSELF already marked not-testable at " +
    "ch15-03-targeting-and-selection.test.ts §15-15-1 for a real, honestly-stated reason: the " +
    "producing action (EndAttack, interpreter.ts, real card BT23-069) exists and is wired to " +
    "ctx.fx.endAttack(), but exercising it needs a live in-progress-attack harness " +
    "(CombatController/combat/legality.ts), which is ch11/ch15 file ownership, not this lane's. " +
    "This chunk shares that exact same gap, not a resolved one — restated here rather than " +
    "silently duplicated. 'By doing' conditions (a player MAY choose to perform the named cost; " +
    "if they decline, none of the effect's later processing happens) restate " +
    "comprehensive-0168/0169/0170, already tested at ch15-02-timing-and-resolution.test.ts §15-6/" +
    "§15-7.",
);

markNotTestable(
  "manual-0054",
  '\'A "by" condition can\'t be performed partly (e.g. "by trashing 2 cards" can\'t be done with ' +
    'only 1)\' and \'performing a "by" condition counts toward [X Per Turn] even if the "then" ' +
    "processing can't happen' restate comprehensive-0168/0169/0170 (ch15-02 §15-6/§15-7) and " +
    'comprehensive-0193 ([X Per Turn], ch15-04 §15-14-1), already tested. \'"With different XX" ' +
    "means each XX in the combination differs' restates comprehensive-0094, already tested at " +
    "ch15-03-targeting-and-selection.test.ts (picked up from ch04, §4-24).",
);

markNotTestable(
  "manual-0055",
  "'\"With different XX\", cont'd' (2 cards with colors red and blue both differing counts as a " +
    '"with different colors" combination) restates comprehensive-0094/0095, already tested at ' +
    "ch15-03-targeting-and-selection.test.ts / ch15-04-continuous-and-static.test.ts (picked up " +
    "from ch04, §4-24/§4-25). 'Effect Timings' / 'Effect Icons' is a bare section-heading " +
    "transition into the icon glossary covered by manual-0056 onward.",
);

markNotTestable(
  "manual-0056",
  "The [On Play] / [X Per Turn] / [When Digivolving] timing-icon definitions restate " +
    "comprehensive-0207/0208 (§15-16 Effect Timings), comprehensive-0193 ([X Per Turn], §15-14-1), " +
    "and comprehensive-0209 ([When Digivolving], §15-16-3) — all already tested at " +
    "ch15-04-continuous-and-static.test.ts.",
);

markNotTestable(
  "manual-0057",
  "The {Hand} / [On Deletion] / {Trash} timing-icon definitions restate comprehensive-0194 " +
    "({Hand}, §15-14-2), comprehensive-0210 ([On Deletion], §15-16-4), and comprehensive-0195 " +
    "({Trash}, §15-14-3) — all already tested at ch15-04-continuous-and-static.test.ts.",
);

markNotTestable(
  "manual-0058",
  "The {Breeding} / [Main] timing-icon definitions restate comprehensive-0196 ({Breeding}, " +
    "§15-14-4) and comprehensive-0213 ([Main], §15-16-7) — already tested at " +
    "ch15-04-continuous-and-static.test.ts.",
);

describe("manual-0059 — Rule Check A: a 0 DP Digimon in the battle area is deleted", () => {
  it(
    "a Digimon standing at 0 DP after effects finish resolving is deleted at the next rule-check " +
      "sweep — the BASELINE fact ch17-rule-checks.test.ts's own §17-1-2-1 test assumes but " +
      "asserts a narrower TIMING nuance on top of (that a 0-DP Digimon created MID-instruction " +
      "isn't deleted until the instruction finishes); this test isolates the baseline instead",
    async () => {
      cite(
        "manual-0059",
        "Rule Checks: 'OA: A Digimon with 0 DP in the battle area is deleted.' (The {Security} / " +
          "[Your Turn]/[Opponent's Turn]/[All Turns]/[Start/End of Turn]/[Start of Main Phase]/" +
          "[Counter]/[End of Attack] timing icons this same chunk also lists restate " +
          "comprehensive-0197/0214/0215/0216/0217/0218/0219, already tested at " +
          "ch15-04-continuous-and-static.test.ts; Rule Check B restates the same comprehensive-" +
          "0264 rule-check-gating family, per-clause coverage in src/engine/ruleProcess.test.ts.)",
      );

      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      const zeroed = digimon(0, 0, "AD1-001"); // seeded DIRECTLY at 0 DP — mirrors ruleProcess
      // .test.ts's own idiom of pre-seeding an illegal board state and driving the real sweep,
      // rather than re-deriving how currentDP reached 0 (that math is chapter-15's scope).
      p0.battleArea.push(zeroed);

      // Open a rule-check timing window the same way ruleProcess.test.ts does: play a cheap,
      // effect-free vanilla Digimon (BT1-009) purely to trigger a fresh `ruleProcess()` pass.
      const trigger = instance("BT1-009", 0, false);
      p0.hand.push(trigger);
      s.state.memory = 2; // BT1-009's printed cost
      const result = s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId });
      expect(result).toEqual({ ok: true });
      await settle(() => !p0.battleArea.some((p) => p.permanentId === zeroed.permanentId), 5000);

      expect(p0.battleArea.some((p) => p.permanentId === zeroed.permanentId)).toBe(false);
      expect(p0.trash.some((c) => c.instanceId === zeroed.topCard?.instanceId)).toBe(true);
    },
  );
});

markNotTestable(
  "manual-0060",
  "Rule Check C ('an Option card in the battle area, except when placed there by an effect, is " +
    "trashed') restates comprehensive-0265-range content already tested at ch17-rule-checks.test." +
    "ts §17-1-3-2-2. Rule Check E ('a link card that doesn't meet its link requirements is " +
    "trashed at the rule-check timing') restates the link-requirement-mismatch rule check already " +
    "tested at ch17-rule-checks.test.ts §17-1-3-2-6/§17-1-3-2-7. Rule Check D (Tamer/Option cards " +
    "in the breeding area, except effect-placed, are trashed) is the same rule-check family, " +
    "covered per-clause by src/engine/ruleProcess.test.ts.",
);

markNotTestable(
  "manual-0061",
  "OCR-DAMAGED: this chunk interleaves 3 different real cards' printed text (a ＜De-Digivolve＞ " +
    "worked example, Koromon, and a DNA digivolution requirement fragment) mid-sentence around " +
    "the rule-check timing note, e.g. 'De-Digivolve 3 1 of your opponent's Digimon and, for the " +
    "turn, all of their Digimon get -ou DP' (a garbled '-6000') and 'ITDNA digivoiving, you may " +
    "play up to 10 play cost's total worth of INSoltrait Digimon cards' ('[NSo] trait', broken by " +
    "OCR). The identifiable normative sentence — 'even if this effect causes a Digimon to no " +
    "longer have DP, it isn't trashed yet' (rule checks don't run mid-effect-resolution) — " +
    "restates comprehensive-0264, already tested at ch17-rule-checks.test.ts §17-1-2-1.",
);

markNotTestable(
  "manual-0062",
  "'The rule check timing occurs, and all of the rule processing is performed simultaneously for " +
    "cards in situations A, B, C, and D' restates comprehensive-0264/the §17-1-3 rule-check " +
    "family, already tested at ch17-rule-checks.test.ts and per-clause at " +
    "src/engine/ruleProcess.test.ts. The tail example ('[On Deletion] effects trigger ... all " +
    "effects that triggered up to this timing are considered to trigger simultaneously') restates " +
    "comprehensive-0164 (Simultaneous Triggering), already tested at " +
    "ch15-02-timing-and-resolution.test.ts §15-4-3.",
);

// Keyword Effects list (manual-0063..manual-0066): every keyword named here already has a
// dedicated describe block in ch16a/ch16b/ch16c, either behaviorally verified or documented as
// an honest unimplemented/engine-bug DIVERGENCE with its own it.fails. Restating each keyword's
// one-line manual definition as a fresh test would just re-run the same fixture ch16 already
// drives; the value here is confirming the manual's own list maps 1:1 onto that existing
// coverage, not re-deriving it.
for (const [id, keywords] of [
  [
    "manual-0063",
    "#1 Security A./Security A- (comprehensive-0221/0222, ch16a §16-1..16-4-4), #2 Jamming " +
      "(comprehensive-0227, ch16a §16-9), #3 Piercing (comprehensive-0225, ch16a §16-7), #4 Rush " +
      "(comprehensive-0233, ch16b §16-15), #5 Blocker (comprehensive-0223, ch16a §16-5), Draw/" +
      "Recovery (comprehensive-0226/0224, ch16a §16-8/§16-6), #7 Delay (comprehensive-0235, ch16b " +
      "§16-17), Barrier (comprehensive-0244, ch16c §16-25), Armor Purge (comprehensive-0237, ch16b " +
      "§16-19, unimplemented), Alliance (comprehensive-0243, ch16c §16-24), Save (comprehensive-" +
      "0238, ch16c §16-20), Material Save (comprehensive-0239/0240, ch16c §16-21, DIVERGENCE), " +
      "Digisorption (comprehensive-0228, ch16b §16-10)",
  ],
  [
    "manual-0064",
    "#11 Partition (comprehensive-0248, ch16c §16-29, unimplemented), Fortitude (comprehensive-" +
      "0246, ch16c §16-27, unimplemented), Blitz (comprehensive-0234, ch16b §16-16), Vortex " +
      "(comprehensive-0252, ch16c §16-33), Raid (comprehensive-0242, ch16c §16-23, unimplemented)",
  ],
  [
    "manual-0065",
    "#25 Reboot (comprehensive-0229, ch16b §16-11), Ascension (comprehensive-0262, ch16c §16-43, " +
      "unimplemented), #26 De-Digivolve/Use Req. (comprehensive-0261, ch16c §16-42, unimplemented), " +
      "Decoy (comprehensive-0236, ch16b §16-18, DIVERGENCE), #28 Collision (comprehensive-0249, " +
      "ch16c §16-30), Overflow (comprehensive-0088, ch04 §4-18), Fragment (comprehensive-0256, " +
      "ch16c §16-37, unimplemented), DNA Digivolve (comprehensive-0127..0130, ch08 §8-2), DigiXros " +
      "(comprehensive-0117/0118, ch07 §7-2), Retaliation (comprehensive-0231, ch16b §16-13, " +
      "documented ENGINE BUG), Scapegoat (comprehensive-0251, ch16c §16-32, unimplemented), " +
      "Execute (comprehensive-0257, ch16c §16-38, unimplemented)",
  ],
  [
    "manual-0066",
    "#33 Digi-Burst (comprehensive-0232, ch16b §16-14), #7 Assembly (comprehensive-0119..0122, " +
      "ch07, not-testable — no engine subsystem, see manual-0034..0036 above), #34 Blast Digivolve " +
      "(comprehensive-0245, ch16c §16-26, unimplemented), #8 Arts Digivolve (comprehensive-0089/" +
      "0050, ch04 §4-19 / ch02 §2-11, unreachable DIVERGENCE), Blast DNA Digivolve " +
      "(comprehensive-0250, ch16c §16-31, unimplemented), Mind Link (comprehensive-0247, ch16c " +
      "§16-28), #37 Link+X (comprehensive-0259, ch16c §16-40)",
  ],
] as const) {
  markNotTestable(
    id,
    `Keyword Effects list restating, one line each, keywords already covered individually: ${keywords}.`,
  );
}
