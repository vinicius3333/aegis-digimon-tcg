import { describe, it, expect, vi } from "vitest";
import { PlayerState, requireCardDefinition } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { GameEngine } from "../GameEngine.js";
import { ContinuousEffectLedger } from "../effects/continuous.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 17 "Rule Checks" (comprehensive-0017, 0263, 0264, 0265).
 *
 * §17-1-3's own sub-clauses (deletion/trash conditions 17-1-3-1-1, 17-1-3-2-1,
 * 17-1-3-2-3, 17-1-3-2-4, 17-1-3-2-5) already have dedicated behavioral coverage in
 * `../ruleProcess.test.ts` (one scenario + one negative control per condition, driven
 * through the real `GameEngine.ruleProcess()` fixpoint) — see `GameEngine.ts`'s own
 * `ruleProcess()` doc comment for the authoritative per-clause citation list. This file
 * does NOT re-derive that coverage. It instead:
 *   - proves the two "when rule checks do / don't run" gating rules (§17-1-2-1, §17-1-2-2)
 *     that `ruleProcess.test.ts` doesn't touch, and
 *   - documents (rather than re-invents) the three §17-1-3-2 sub-clauses `GameEngine.ts`'s
 *     own comment already states are NOT implemented (§17-1-3-2-2, §17-1-3-2-6, §17-1-3-2-7),
 *     with a fresh behavioral demonstration of each gap rather than restating the comment.
 *
 * comprehensive-0017 (TOC dot-leader) and comprehensive-0263 (bare chapter heading) carry
 * no normative content and are seeded in `not-testable.ts` (imported above for its
 * registration side effect).
 */

describe("§17-1-2-1 rule checks aren't performed during rule processing (comprehensive-0264)", () => {
  it("the ruleProcessing re-entrancy latch suppresses a real, concrete violation while a pass is in flight", () => {
    cite(
      "comprehensive-0264",
      "17-1-2-1: rule checks aren't performed during rule processing — a Digimon with 0 DP " +
        "created mid-pass isn't deleted until the NEXT rule check, not the one already running",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // A real §17-1-3-1-1 deletion target (raw DP 0, battle-area Digimon) — not a stand-in.
    const violator = digimon(0, 0);
    p0.battleArea.push(violator);

    const engineAny = s.engine as unknown as { doRuleProcess(): boolean; ruleProcessing: boolean };

    // Baseline: outside of a pass, the violation IS detected — proves the predicate itself
    // is live and would fire if not suppressed (a meaningful negative control for what follows).
    expect(engineAny.doRuleProcess()).toBe(true);

    // Simulate being mid rule-check pass — GameEngine.ts's own `ruleProcess()` sets this
    // exact flag for the duration of one pass, specifically to satisfy §17-1-2-1.
    engineAny.ruleProcessing = true;
    expect(engineAny.doRuleProcess()).toBe(false); // suppressed: "rule checks aren't performed during rule processing"

    engineAny.ruleProcessing = false;
    expect(engineAny.doRuleProcess()).toBe(true); // resumes the instant the pass finishes
  });
});

describe("§17-1-2-2 rule checks aren't performed during effect processing (comprehensive-0264)", () => {
  it(
    "BT3-101's own worked-example shape ('-3000 DP AND <Security Attack -1>' in one effect) proves " +
      "both clauses complete before any rule check runs — the keyword grant lands on a permanent " +
      "already at 0 DP, moments before that same permanent is trashed by the check AFTER the effect",
    async () => {
      cite(
        "comprehensive-0264",
        "17-1-2-2: rule checks aren't performed during effect processing — the rule's OWN example " +
          "is a Digimon gaining -3000 DP AND <Security Attack -1> in one instruction; the DP-0 " +
          "Digimon is deleted only AFTER it also gains the keyword, not between the two clauses",
      );
      // BT3-101 "Bifrost": "[Main] 1 of your opponent's Digimon gets -3000 DP and <Security
      // Attack -1> ... until the end of your opponent's next turn." This is not an
      // approximation of the rule's example — the printed text matches it clause-for-clause.
      const def = requireCardDefinition("BT3-101");
      expect(def.effectText).toContain("-3000 DP");
      expect(def.effectText).toContain("Security Attack -1");

      // Spy on the keyword-grant seam (ContinuousEffectLedger.addKeywordGrant): if the rule
      // check ran BETWEEN the two clauses (i.e. after -3000 DP dropped the target to 0), the
      // target would already be gone from the battle area by the time the GainKeyword clause's
      // targeting filter (opponent's Digimon) runs, and this spy would never fire for it. It
      // firing is direct evidence the second clause still saw a live, targetable permanent.
      const grantSpy = vi.spyOn(ContinuousEffectLedger.prototype, "addKeywordGrant");

      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;
      // A Yellow source on p0's own field so this test doesn't ride on the separately
      // documented color-requirement-enforcement gap (ch04 comprehensive-0091 divergence).
      p0.battleArea.push(digimon(0, 1000, "BT1-045"));
      const target = digimon(1, 3000, "AD1-001"); // raw DP exactly 3000: -3000 lands it at 0
      p1.battleArea.push(target);

      const option = instance("BT3-101", 0, false);
      p0.hand.push(option);
      s.state.memory = def.playCost;

      const result = s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
      expect(result).toEqual({ ok: true });
      await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId), 5000);

      // The keyword clause DID resolve against the (momentarily 0-DP but not-yet-deleted)
      // target before it was trashed — the rule check waited for the whole effect.
      expect(grantSpy.mock.calls.some((call) => call[0] === target.permanentId && call[1] === "SecurityAttack")).toBe(
        true,
      );

      // AFTER the full effect (both clauses) resolved, the rule check then deleted the
      // now-0-DP target — proving the check ran, just not until the effect finished.
      expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
      expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);

      grantSpy.mockRestore();
    },
  );
});

describe("§17-1-3-2-2 Option cards in the battle area, except effect-placed ones — NOT IMPLEMENTED (comprehensive-0265)", () => {
  it("NOW MET: an Option-kind permanent sitting in the battle area (not placed there by an effect) should be trashed by the rule-check sweep", async () => {
    cite(
      "comprehensive-0265",
      "DIVERGENCE (cross-referenced, not re-derived): §17-1-3-2-2 'Option cards in the battle " +
        "area (except Option cards placed in the battle area by an effect)' are a trash target. " +
        "GameEngine.ts's own ruleProcess() doc comment already names this gap: `Permanent` " +
        "carries no field distinguishing 'placed by an effect' from any other origin, so this " +
        "condition is omitted entirely from doRuleProcess()'s predicate list (no anyOptionInBattleArea " +
        "check exists at all) — not narrowed-but-buggy, simply absent.",
    );

    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    // A real Option card (BT3-101) seeded directly onto the battle area — a state that
    // cannot arise through any legal play path (a normal Option play never reaches
    // `placePermanent`; see GameEngine.ts's own comment), used here purely to exercise the
    // rule-check sweep against an illegally-placed Option permanent.
    const illegalOption = digimon(1, 0, "BT3-101");
    p1.battleArea.push(illegalOption);

    const trigger = instance("BT1-009", 0, false); // vanilla, effect-free — pure timing-window opener
    const s0 = s.state.players[0] as PlayerState;
    s0.hand.push(trigger);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId })).toEqual({ ok: true });
    await settle();

    // EXPECTED (per §17-1-3-2-2): trashed, since it wasn't placed there by an effect.
    expect(p1.battleArea.some((p) => p.permanentId === illegalOption.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === illegalOption.topCard?.instanceId)).toBe(true);
  });
});

describe("§17-1-3-2-6 / §17-1-3-2-7 link requirement / link category mismatch — NOT IMPLEMENTED (comprehensive-0265)", () => {
  it("NOW MET: a linked card whose printed <Link> requirement the host no longer (or never did) satisfy should be trashed by the rule-check sweep", async () => {
    cite(
      "comprehensive-0265",
      "DIVERGENCE (cross-referenced, not re-derived): §17-1-3-2-6 'Link cards that don't meet " +
        "the link requirements' and §17-1-3-2-7 'Linked cards in a card category other than " +
        "those specified in the notes for <Link>' are both trash targets. GameEngine.ts's own " +
        "ruleProcess() doc comment already names this gap: the compiled `linkRequirement` string " +
        "exists on CardDefinition, but nothing at runtime re-evaluates a linked card's live host " +
        "against it after the link is made — `canLinkToTargetPermanent` only gates a NEW link at " +
        "declaration time. `anyExcessLinkCards` (§17-1-3-2-5, already implemented) checks only the " +
        "COUNT of linked cards, never whether each one's own requirement still holds.",
    );

    // BT21-009 (Gatchmon): printed `linkRequirement: "[Link] [Appmon] trait: Cost 1"` — legal
    // only on a host carrying the [Appmon] trait.
    const linkDef = requireCardDefinition("BT21-009");
    expect(linkDef.linkRequirement).toContain("Appmon");

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // AD1-001 (Greymon): traits are [Dinosaur, ADVENTURE] — no [Appmon] trait anywhere. A
    // real host that categorically fails BT21-009's own printed link requirement.
    const hostDef = requireCardDefinition("AD1-001");
    expect(hostDef.types ?? []).not.toContain("Appmon");
    const host = digimon(0, 5000, "AD1-001");
    const mismatchedLink = instance("BT21-009", 0, true);
    host.linked.push(mismatchedLink);
    p0.battleArea.push(host);

    const trigger = instance("BT1-009", 0, false);
    p0.hand.push(trigger);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId })).toEqual({ ok: true });
    await settle();

    // EXPECTED (per §17-1-3-2-6/2-7): trashed — the host never carried [Appmon].
    expect(host.linked.some((c) => c.instanceId === mismatchedLink.instanceId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === mismatchedLink.instanceId)).toBe(true);
  });
});

// §17-1-1 (comprehensive-0264, shared chunk): the definitional preamble ("a rule check is a
// rule for performing the respective processing for certain circumstances during timings when
// rule checks are possible") has no standalone behavior of its own to assert beyond what
// §17-1-2-1/§17-1-2-2 above and the §17-1-3 sub-clauses (ruleProcess.test.ts) already prove —
// it is the header sentence those tests collectively demonstrate, not a separate testable claim.
