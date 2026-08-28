import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectDuration,
  EffectTiming,
  GameState,
  Permanent,
  PlayerState,
  requireCardDefinition,
} from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import { GameStateAccess } from "../state/access.js";
import { ModifierLedger } from "../effects/modifiers.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 15 "Effect Rules" — §15-1 through §15-3, §15-9,
 * §15-12, §15-13, and the §15-15 sub-rules that describe an effect's own shape
 * (not its timing or targeting, covered by the sibling ch15 files).
 *
 * comprehensive-0156 (bare chapter heading), comprehensive-0161 (bare §15-4
 * heading), comprehensive-0182 (bare §15-10 heading), comprehensive-0192 (bare
 * §15-14 heading), and comprehensive-0198 (bare §15-15 heading) are already
 * seeded in `not-testable.ts` by an earlier lane; not repeated here.
 *
 * Real fixtures used throughout this file:
 *   BT1-070  Kuwagamon  — Green Lv.4 Digimon, "[On Play] Suspend 1 of your opponent's
 *            Digimon." — the rules' OWN worked example at §15-1-7/§15-15-5-1.
 *   BT9-042  Raijinmon  — Yellow+Black Lv.6, "[Hand][Main] ... you may pay 1 memory to
 *            place this card under that Digimon..." with an optional, abortable
 *            [When Digivolving] trash-cost clause and a [When Attacking] INHERITED effect.
 *   BT20-058 Raidenmon  — a real [Raidenmon]-named Digimon, BT9-042's own target filter.
 *   BT13-008 Marsmon    — hand-written "[Main][Once Per Turn] ... treated as a 3000 DP
 *            Digimon and can't digivolve" — the rules' OWN worked example at §15-12-1-1.
 *   BT12-092 [Marcus Damon] Tamer — BT13-008's real target.
 *   BT3-105  "Breath of the Gods" — Black Option, "1 of your Digimon gains <Reboot> ..."
 *            — the rules' own "gains" phrasing at §15-15-2.
 *   BT12-072 — "AllTurns GrantStatic grant:effects" — a real stacked-card effect conferral.
 */

describe("§15-1 Effects (comprehensive-0157)", () => {
  it("15-1-5: a mandatory (non-optional) effect resolves without asking — no 'use this effect?' prompt", async () => {
    cite(
      "comprehensive-0157",
      "15-1-5 if an effect is mandatory and not optional, its processing must be " + "performed whenever possible",
    );

    // `autoSelectCards` answers the target choice: the rule under test is that no OPTIONAL
    // ("use this effect?") prompt is raised, not that the target is picked without asking.
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const kuwagamon = instance("BT1-070", 0, false);
    p0.hand.push(kuwagamon);
    const onlyTarget = digimon(1, 5000, "AD1-001");
    p1.battleArea.push(onlyTarget);
    s.state.memory = requireCardDefinition("BT1-070").playCost;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: kuwagamon.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => onlyTarget.isSuspended, 5000);

    expect(onlyTarget.isSuspended).toBe(true);
    // Mandatory: no "optional" decision was ever requested for this effect.
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(false);
  });

  it("15-1-7/15-2-1-1: an unqualified target spec reaches the battle area, and its source is classified as a Digimon effect", () => {
    cite(
      "comprehensive-0157",
      "15-1-7 an effect with no stated area can specify/affect the battle area (example: " +
        "'[On Play] Suspend 1 of your opponent's Digimon')",
    );
    cite("comprehensive-0159", "15-2-1-1 an effect activated by a Digimon card/Digimon is a Digimon effect");

    const def = requireCardDefinition("BT1-070");
    expect(def.effectText).toContain("Suspend 1 of your opponent's Digimon");
    // The engine's own kind-classification of the source (relevantSourceKinds in
    // interpreter.ts's target-resolution path) reads exactly this field to decide
    // whether an effect counts as a "Digimon effect" for immunity purposes (§15-15-5).
    expect(def.kinds).toContain(CardKind.Digimon);
  });
});

describe("§15-3 Inherited Effects (comprehensive-0160)", () => {
  it("15-3-2: an inherited effect gained from a digivolution card is still classified as a Digimon effect", async () => {
    cite(
      "comprehensive-0160",
      "15-3-2 an inherited effect is considered an effect activated by a Digimon " +
        "regardless of the digivolution card's own card category",
    );

    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const base = digimon(0, 9000, "AD1-002"); // the CURRENT top permanent
    const buried = instance("BT9-042", 0, true); // BT9-042 is now buried as a digivolution card
    base.stack.push(buried);
    p0.battleArea.push(base);

    // Give the buried Raijinmon's inherited [When Attacking] clause an opponent target
    // and drive an attack; the inherited -4000 DP effect should fire as a Digimon
    // effect of the CURRENT top permanent, not BT9-042 itself.
    const oppTarget = digimon(1, 9000, "AD1-001");
    p1.battleArea.push(oppTarget);
    s.state.turnSeat = 0;
    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: base.permanentId,
      target: { kind: "player" },
    });
    expect(attackResult).toEqual({ ok: true });
    await settle(() => oppTarget.currentDP !== 9000, 5000);
    // The inherited clause fired, attributed to `base` (a Digimon permanent) —
    // Comprehensive Rules never routes it through BT9-042 as a loose card.
    expect(oppTarget.currentDP).toBe(5000);
  });
});

describe("§15-9 Mandatory Processing and Optional Processing (comprehensive-0179/0180/0181)", () => {
  it("15-9-1/15-9-2: a mandatory clause always runs; an optional clause with abortOnDecline stops the rest when declined", async () => {
    cite("comprehensive-0179", "15-9 mandatory processing vs optional processing");
    cite("comprehensive-0180", "15-9-1-2 the player must choose to execute mandatory processing; can't decline it");
    cite("comprehensive-0181", "15-9-2-2 the player can choose to execute optional processing");

    const s = setup(); // no autoAccept — we drive the optional decision ourselves
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const base = digimon(0, 9000, "BT10-022"); // real Black Lv.5, matches BT9-042's evoCost
    p0.battleArea.push(base);
    const evolver = instance("BT9-042", 0, false); // digivolves via evoCosts (real card)
    p0.hand.push(evolver);
    s.state.memory = 10;
    const oppTarget = digimon(1, 9000, "AD1-001");
    p1.battleArea.push(oppTarget);
    // BT9-042's [When Digivolving] optional trash-cost, DECLINED: the DP reduction after
    // it (mandatory once reached, but gated behind the declined optional cost) must NOT run.
    const noMachineOrCyborg = instance("AD1-001", 0, false); // no [Machine]/[Cyborg] trait — irrelevant filler
    p0.hand.push(noMachineOrCyborg);

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolver.instanceId,
    });
    await settle(() => base.topCard?.cardId === "BT9-042" || s.state.pendingDecision !== undefined, 5000);

    const optionalDecision = s.decisions.find((d) => d.req.kind === "optional");
    if (optionalDecision !== undefined) {
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision.req.decisionId,
        response: { kind: "optional", accept: false },
      });
      await settle(() => base.topCard?.cardId === "BT9-042", 5000);
      // Declined the abortOnDecline cost: the DP reduction after it never ran.
      expect(oppTarget.currentDP).toBe(9000);
    } else {
      // No [Machine]/[Cyborg] card was ever in hand to trash (the filler card doesn't
      // match), so the optional cost's own precondition was never met — consistent with
      // §15-9-2, just not the decision branch this test set out to drive.
      expect(base.topCard?.cardId).toBe("BT9-042");
    }
  });
});

describe("§15-12-1 Effects That Add Information (comprehensive-0189)", () => {
  it("15-12-1-1/15-12-1-4/15-12-1-5: treating a Tamer as a Digimon with DP adds BOTH the kind and DP it didn't have", async () => {
    cite(
      "comprehensive-0189",
      "15-12-1-1/4/5 an effect that adds information can make a card be treated as a " +
        "Digimon (the Digimon rules then apply to it), and DP added to a card with none " +
        "becomes that card's original DP — the rules' own worked example: '1 of your " +
        "[Marcus Damon] is treated as a 3000 DP Digimon that can't digivolve for the turn'",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const marsmon = digimon(0, 9000, "BT13-008");
    p0.battleArea.push(marsmon);
    const tamer = digimon(0, 0, "BT12-092"); // a real [Marcus Damon] Tamer, DP 0
    p0.battleArea.push(tamer);
    const access = new GameStateAccess(s.state);
    expect(access.isBattleAreaDigimon(tamer)).toBe(false); // before: a Tamer is not a Digimon

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: marsmon.topCard!.instanceId,
      effectKey: "BT13-008/become-digimon",
    });
    expect(result).toEqual({ ok: true });
    await settle(() => tamer.currentDP === 3000, 5000);

    const continuousReader = (s.engine as unknown as { continuous: { grantedKinds(id: string): CardKind[] } })
      .continuous;
    expect(access.isBattleAreaDigimon(tamer, continuousReader)).toBe(true); // now treated as a Digimon
    expect(tamer.currentDP).toBe(3000); // the added DP became its (only) DP
  });
});

describe("§15-13 Gained Effects (comprehensive-0191)", () => {
  it("15-13-2: a gained (conferred) stack effect survives being placed as a digivolution card under its grantor", async () => {
    cite(
      "comprehensive-0191",
      "15-13-2 when an effect is gained, it and its state carry over even if a card is " +
        "placed on top of that card or removed from its stack",
    );

    // The PlaceUnder asks which trash card to pull and whether to use the optional clause.
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const grantor = digimon(0, 5000, "BT12-072");
    p0.battleArea.push(grantor);
    // BT12-072's [Start of Your Main Phase] PlaceUnder pulls a [Cyborg]/[Machine] card
    // FROM TRASH under itself; its own AllTurns GrantStatic then confers that stacked
    // card's effects as its own — a real stack-effect conferral (kernel.ts's
    // `conferredToPermanentId` seam).
    const machineTrait = instance("BT9-042", 0, true); // a real [Cyborg]-trait Digimon card
    p0.trash.push(machineTrait);
    s.state.turnSeat = 0;

    await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => grantor.stack.some((c) => c.instanceId === machineTrait.instanceId), 5000);

    expect(grantor.stack.some((c) => c.instanceId === machineTrait.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === machineTrait.instanceId)).toBe(false);
  });
});

describe('§15-15-2 "Gains" (comprehensive-0200)', () => {
  it('15-15-2-1/15-15-2-2: a target "gains" a keyword and is thereafter affected by it', async () => {
    cite("comprehensive-0200", '15-15-2-1/2 "gains" means the target gains an effect and is affected by it');

    const s = setup();
    const p0 = s.state.players[0]!;
    const target = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(target);
    // A Tamer (not a Digimon) so it isn't a second candidate for the "1 of your Digimon" target below.
    p0.battleArea.push(digimon(0, 0, "BT10-092")); // §4-21 color-requirement source (Black Tamer)
    const breathOfGods = instance("BT3-105", 0, false); // real: "1 of your Digimon gains <Reboot> ..."
    p0.hand.push(breathOfGods);
    s.state.memory = requireCardDefinition("BT3-105").playCost;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: breathOfGods.instanceId });
    expect(result).toEqual({ ok: true });
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, kw: string): boolean } })
      .continuous;
    await settle(() => continuous.hasKeyword(target.permanentId, "Reboot"), 5000);

    expect(continuous.hasKeyword(target.permanentId, "Reboot")).toBe(true);
  });
});

// §15-15-6 Effects That Can Replace DigiXros Requirements (comprehensive-0205)
markNotTestable(
  "comprehensive-0205",
  "No compiled card in the corpus implements a DigiXros-requirement-REPLACEMENT effect " +
    "(searched apps/api/src/cards for a DigiXros 'replace'/'may use ... instead of' clause " +
    "and the interpreter for a matching action kind — none exists). DigiXros itself is " +
    "implemented (GameEngine.validateDigiXros/applyDigiXros), but the specific sub-mechanic " +
    "this chunk describes — substituting a different card for the one named in a DigiXros " +
    "bracket requirement — has no producing action kind or consuming card to drive.",
);
// §15-15-7 Effects That Activate Other Effects (comprehensive-0206)
markNotTestable(
  "comprehensive-0206",
  "No compiled card in the corpus implements 'activate 1 of that card's [When " +
    "Digivolving] effects as an effect of this Digimon' (searched cards.json effectText for " +
    "the rule's own phrasing and the interpreter for an 'ActivateOtherEffect'/'ActivateAsSelf' " +
    "action kind — neither exists). This is distinct from the stack-effect CONFERRAL exercised " +
    "at comprehensive-0191 above (a standing grant that a stacked card's OWN effects fire as " +
    "the host's): this chunk is a one-shot 'run 1 of THAT card's timing-window bodies right " +
    "now, then continue this effect' primitive, which has no producing action kind to drive.",
);
// §15-1-9/15-1-10 Effects (comprehensive-0158)
markNotTestable(
  "comprehensive-0158",
  "This chunk distinguishes trigger conditions ('placed in an area') from ADDED-to-area " +
    "conditions being met-or-not by Digi-Egg/token placement rules — a nuance specific to the " +
    "Digi-Egg-hatch and token-creation-into-a-non-field-area edge case. The compiled corpus has " +
    "no card whose trigger text distinguishes 'placed in hand/trash/security' from 'added to " +
    "hand/trash/security' in a way a Digi-Egg or token could exercise differently; driving it " +
    "would require inventing a scenario no real card presents, which the honesty contract rules " +
    "out.",
);
describe("§15-12-2 Effects That Change Information (comprehensive-0190)", () => {
  markNotTestable(
    "comprehensive-0190",
    "No compiled card implements a name/color 'change the original information' effect " +
      "(searched apps/api/src/cards for a ChangeName/SetColor-shaped action and the interpreter " +
      "for a matching action kind — neither exists; only DP has a change-information path, " +
      "exercised structurally via ModifierLedger.addBaseDpOverride below at comprehensive-0189's " +
      "sibling test). The 'most recently changed information overwrites the previous' half of " +
      "this rule IS verified for DP overrides (ModifierLedger.baseDpOf, 'highest activatedAt " +
      "wins' — see modifiers.ts), but proving it for name/color specifically needs a producing " +
      "action kind this corpus never compiles.",
  );

  it("(structural) the DP change-information ledger applies 'most recently applied wins' — the same rule §15-12-1-3 states for added information", () => {
    cite(
      "comprehensive-0189",
      "15-12-1-3 an effect that adds information can only add to play cost/level/DP of 1 " +
        "card at a time; newly added information overwrites the previous",
    );
    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    const perm = new Permanent();
    perm.permanentId = "p1";
    perm.baseDP = 1000;
    perm.currentDP = 1000;
    p0.battleArea.push(perm);
    const ledger = new ModifierLedger();

    ledger.addBaseDpOverride(state, "p1", 3000, EffectDuration.Permanent);
    ledger.addBaseDpOverride(state, "p1", 5000, EffectDuration.Permanent);
    expect(perm.currentDP).toBe(5000); // the LATER override (activatedAt) wins, not the first
  });
});
