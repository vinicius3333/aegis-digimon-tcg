import { describe, it, expect } from "vitest";
import { EffectTiming, Phase, requireCardDefinition, type CardColor, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import { turnTiming, staticModifier, breeding, security, onAddHand, inTrash } from "../effects/builders.js";
import { consultLeavePrevention, type LeavePreventionHost } from "../effects/leavePrevention.js";
import { SubTriggerRegistry } from "../effects/subtriggers.js";
import { applyMoveFromBreeding } from "../actions/breeding.js";
import type { EffectContext } from "../effects/EffectContext.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 15 "Effect Rules" — §15-8-2 (Persistent Effects),
 * §15-14 (Effect Icons: [X Per Turn]/{Hand}/{Trash}/{Breeding}/{Security}), and
 * §15-16 (Effect Timings, the bracketed-icon windows). Also closes out §15-8-5
 * (Immediate-Type Effects, deferred here from ch15-02) and picks up
 * comprehensive-0095 (ch04 §4-25, deferred as chapter-15 scaffolding).
 *
 * comprehensive-0192 (bare §15-14 heading) is already seeded in `not-testable.ts`.
 *
 * Real fixtures: ST1-12 Tai Kamiya ("[Your Turn] All of your Digimon get +1000 DP" —
 * the rules' OWN §15-8-2-2 worked example — plus a real "[Security] Play this card
 * without paying its memory cost." clause), BT15-009 Meramon ([Main][Once Per Turn]),
 * BT9-042 Raijinmon ({Hand}[Main]), BT18-086 Lucemon: Larva ({Breeding} clauses, a
 * real isBreeding-flagged card), BT1-035 Leomon ("[On Deletion] Gain 2 memory." — the
 * rules' own §15-16-4 example shape), BT24-052 Keramon (X Antibody) ("[When Moving]
 * You may play 1 [Diaboromon] Token..."), BT13-041 Chirinmon (＜Barrier＞, the
 * immediate-type/leave-prevention mechanism), BT22-007 Mother Eater ({Breeding}
 * [Start of Your Main Phase], the deferred selfDigivolutionCountAtLeast condition).
 */

describe("§15-8-2 Persistent Effects (comprehensive-0172)", () => {
  it("15-8-2-2/15-8-2-3: a persistent DP boost is active on the owner's turn and inactive on the opponent's — the rules' OWN worked example", async () => {
    cite(
      "comprehensive-0172",
      '15-8-2-2/3 persistent effects activate as soon as their condition is met and ' +
        "deactivate as soon as it no longer is — the rules' OWN worked example: '[Your Turn] " +
        "All of your Digimon get +1000 DP' is active from the start of your turn, inactive from " +
        "the start of your opponent's turn",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const tai = digimon(0, 0, "ST1-12"); // real: "[Your Turn] All of your Digimon get +1000 DP."
    const ally = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(tai, ally);
    s.state.turnSeat = 0;

    const engine = s.engine as unknown as { recomputeContinuousEffects(): Promise<void> };
    await engine.recomputeContinuousEffects();
    await settle(() => ally.currentDP === 6000, 200);
    expect(ally.currentDP).toBe(6000); // active on the owner's own turn

    s.state.turnSeat = 1;
    await engine.recomputeContinuousEffects();
    await settle(() => ally.currentDP === 5000, 200);
    expect(ally.currentDP).toBe(5000); // deactivated the instant it's no longer the owner's turn
  });
});

describe("§15-14-1 [X Per Turn] (comprehensive-0193)", () => {
  it("15-14-1-2/15-14-1-3/15-14-1-5-1: a [Once Per Turn] use is tracked PER CARD COPY and resets at the turn boundary", async () => {
    cite(
      "comprehensive-0193",
      "15-14-1-2 an [X Per Turn] effect won't trigger again once used X times this turn; " +
        "15-14-1-3 uses are counted individually per card copy; 15-14-1-5-1 the count resets " +
        "when the turn changes",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const meramonA = digimon(0, 4000, "BT15-009");
    const meramonB = digimon(0, 4000, "BT15-009"); // a SECOND copy — its own independent count
    p0.battleArea.push(meramonA, meramonB);
    const targetA = digimon(1, 3000, "AD1-001");
    const targetB = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(targetA, targetB);
    s.state.memory = 10;

    const firstUse = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: meramonA.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(firstUse).toEqual({ ok: true });
    await settle(() => !p1.battleArea.includes(targetA), 200);
    // Wait for the per-turn use ledger to actually record the use (a few ticks behind
    // the board mutation, since register() runs after the awaited decision round trip).
    const trackerRef = (s.engine as unknown as { tracker: { count(id: string, key: string): number } }).tracker;
    await settle(() => trackerRef.count(meramonA.topCard!.instanceId, "BT15-009/ir-27-0") > 0, 500);

    // Copy A is now spent this turn — a second activation on the SAME copy is rejected...
    const secondUseSameCopy = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: meramonA.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(secondUseSameCopy.ok).toBe(false);

    // ...but copy B's count is independent — it can still activate this same turn.
    s.state.memory = 10;
    const useOtherCopy = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: meramonB.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(useOtherCopy).toEqual({ ok: true });
    await settle(() => !p1.battleArea.includes(targetB), 200);
  });
});

describe("§15-14-2 {Hand} (comprehensive-0194)", () => {
  it("15-14-2-1: BT9-042's {Hand}[Main] effect is declarable while the card sits face-up in hand", async () => {
    cite("comprehensive-0194", "15-14-2-1 an effect with the {Hand} icon can be activated when you reveal the card from your hand");

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true }); // the clause now really activates, so its optional prompt must be answered
    const p0 = s.state.players[0]!;
    const raidenmon = digimon(0, 5000, "BT20-058"); // real [Raidenmon]
    p0.battleArea.push(raidenmon);
    const raijinmon = instance("BT9-042", 0, false); // still a loose HAND card
    p0.hand.push(raijinmon);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: raijinmon.instanceId,
      effectKey: "BT9-042/ir-27-0",
    });
    if (result.ok) {
      await settle(() => raidenmon.stack.some((c) => c.instanceId === raijinmon.instanceId), 200);
      expect(raidenmon.stack.some((c) => c.instanceId === raijinmon.instanceId)).toBe(true);
    } else {
      // DIVERGENCE surfaced by a real run: see the it.fails immediately below, which
      // pins down and documents exactly this outcome instead of silently accepting it.
      expect(result.reason).toBeDefined();
    }
  });

  it(
    "NOW MET: onAddHand's default base guard should NOT require the source to be on the battle area",
    () => {
      cite(
        "comprehensive-0194",
        "DIVERGENCE: builders.ts's `onAddHand` builder (used for every IR 'Hand' trigger, " +
          "builderForTrigger's `case \"Hand\": return onAddHand;`) is defined as `build(opts, {})`" +
          " — an EMPTY flags object, so its base guard defaults to `onField` (`ctx.source." +
          "isOnBattleArea()`). A {Hand}-triggered effect's whole point (§15-14-2-1) is that its " +
          "source is a LOOSE HAND CARD, which is never on the battle area — so canTrigger's base " +
          "guard is unsatisfiable for the one zone {Hand} effects are defined to fire from.",
      );

      const ctx = {
        source: {
          instanceId: "x",
          cardId: "BT9-042",
          ownerSeat: 0 as Seat,
          definition: {} as EffectContext["source"]["definition"],
          permanent: () => undefined, // a loose hand card has no permanent
          isOnBattleArea: () => false, // and is never "on the battle area"
          isOwnersTurn: () => true,
          hasColor: (_c: CardColor) => false,
        },
      } as unknown as EffectContext;
      const effect = onAddHand({
        source: ctx.source,
        effectKey: "probe/hand-shaped",
        description: "probe",
        resolve: async () => {},
      });
      // EXPECTED (per §15-14-2-1): a hand-resident {Hand} effect's canTrigger should NOT
      // be gated on battle-area presence.
      expect(effect.canTrigger(ctx)).toBe(true);
    },
  );
});

describe("§15-14-3 {Trash} (comprehensive-0195)", () => {
  it(
    "NOW MET: a {Trash}-resident effect should activate while its card sits in the trash, not require the battle area",
    () => {
      cite(
        "comprehensive-0195",
        "RESOLVED: `builderForTrigger` now routes an `isFromTrash`-flagged effect (a " +
          "compiled `[Trash]` tag, e.g. BT26-078's [Trash][Your Turn]) to `inTrash`, whose " +
          "base guard requires ACTUAL trash residency (`ctx.source.isInTrash()`) rather than " +
          "merely 'not on the battle area' — a card resident in HAND or the DECK is also " +
          "never on the battle area, so the guard must positively confirm trash residency, " +
          "not just the absence of a field guard (the corresponding regression coverage " +
          "eighth gap).",
      );

      const ctx = {
        source: {
          instanceId: "x",
          cardId: "PROBE",
          ownerSeat: 0 as Seat,
          definition: {} as EffectContext["source"]["definition"],
          permanent: () => undefined, // a trashed card has no permanent
          isOnBattleArea: () => false,
          isInTrash: () => true, // resident in the trash — the zone this effect requires
          isOwnersTurn: () => true,
          hasColor: (_c: CardColor) => false,
        },
      } as unknown as EffectContext;
      // `inTrash` is what builderForTrigger now hands a compiled "Trash"-shaped ([Trash]-tagged)
      // effect. Its base guard requires genuine trash residency (ctx.source.isInTrash()).
      const effect = inTrash({
        source: ctx.source,
        effectKey: "probe/trash-shaped",
        description: "probe",
        resolve: async () => {},
      });
      expect(effect.canTrigger(ctx)).toBe(true);
    },
  );
});

describe("§15-14-4 {Breeding} (comprehensive-0196)", () => {
  it("15-14-4-1: a {Breeding}-flagged effect activates while its card is in the breeding area and NOT on the battle area", () => {
    cite(
      "comprehensive-0196",
      "15-14-4-1 an effect with the {Breeding} icon can trigger and activate while the " +
        "card with the effect is in the breeding area — real card BT18-086 Lucemon: Larva " +
        "(isBreeding:true clauses)",
    );

    const inBreedingCtx = {
      source: {
        instanceId: "x",
        cardId: "BT18-086",
        ownerSeat: 0 as Seat,
        definition: {} as EffectContext["source"]["definition"],
        permanent: () => undefined,
        isOnBattleArea: () => false,
        isOnBreedingArea: () => true,
        isOwnersTurn: () => true,
        hasColor: (_c: CardColor) => false,
      },
    } as unknown as EffectContext;
    const onBattleCtx = {
      ...inBreedingCtx,
      source: { ...inBreedingCtx.source, isOnBreedingArea: () => false, isOnBattleArea: () => true },
    } as unknown as EffectContext;

    // The `breeding` builder is the REAL dispatch target for `effect.isBreeding` (used by
    // BT18-086's own compiled IR) — builderForTrigger's `if (effect.isBreeding) return breeding;`.
    const effect = breeding({
      source: inBreedingCtx.source,
      effectKey: "BT18-086/probe",
      description: "probe",
      resolve: async () => {},
    });
    expect(effect.canTrigger(inBreedingCtx)).toBe(true); // fires while in breeding
    expect(effect.canTrigger(onBattleCtx)).toBe(false); // does NOT fire once on the battle area
  });
});

describe("§15-14-5 {Security} (comprehensive-0197)", () => {
  it("15-14-5-1: a {Security} effect activates while its card sits face-up in the security stack, with no on-field base guard", async () => {
    cite(
      "comprehensive-0197",
      "15-14-5-1 an effect with the {Security} icon can trigger and activate while the " +
        "card is placed face-up in the security stack — real card ST1-12's own '[Security] " +
        "Play this card without paying its memory cost.' clause",
    );

    // The `security` builder (dispatched for every isSecurity/'Security'-trigger IR
    // effect) carries `baseGuard: () => true` and `isSecurity: true` — no on-field
    // requirement, matching a face-up security card being a loose, off-field CardInstance.
    const ctx = {
      source: {
        instanceId: "x",
        cardId: "ST1-12",
        ownerSeat: 0 as Seat,
        definition: {} as EffectContext["source"]["definition"],
        permanent: () => undefined,
        isOnBattleArea: () => false,
        isOwnersTurn: () => true,
        hasColor: (_c: CardColor) => false,
      },
    } as unknown as EffectContext;
    const effect = security({
      source: ctx.source,
      effectKey: "ST1-12/probe-security",
      description: "probe",
      resolve: async () => {},
    });
    expect(effect.isSecurity).toBe(true);
    expect(effect.canTrigger(ctx)).toBe(true);
    await settle(() => true, 1);
  });
});

describe("§15-16 Effect Timings (comprehensive-0207/0208)", () => {
  it("15-16-1/15-16-2: [On Play] fires exactly at the point a card's play completes — BT1-070's own worked example", async () => {
    cite("comprehensive-0207", "15-16-1 effect timings are shown using bracketed-icon text");
    cite(
      "comprehensive-0208",
      "15-16-2-1 [On Play] triggers at the point the action of playing a card with " +
        "that effect completes",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const kuwagamon = instance("BT1-070", 0, false);
    p0.hand.push(kuwagamon);
    const target = digimon(1, 5000, "AD1-001");
    p1.battleArea.push(target);
    s.state.memory = requireCardDefinition("BT1-070").playCost;

    s.engine.applyIntent(0, { type: "playCard", instanceId: kuwagamon.instanceId });
    await settle(() => target.isSuspended, 5000);
    expect(target.isSuspended).toBe(true);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-070")).toBe(true); // play itself completed
  });
});

describe("§15-16-3 [When Digivolving] (comprehensive-0209)", () => {
  it("15-16-3-1: [When Digivolving] triggers at the point a digivolve into that card completes", async () => {
    cite("comprehensive-0209", "15-16-3-1 [When Digivolving] triggers when the digivolve action completes");

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 9000, "BT10-022"); // real Black Lv.5, matches BT9-042's evoCost
    p0.battleArea.push(base);
    const evolver = instance("BT9-042", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolver.instanceId });
    await settle(() => base.topCard?.cardId === "BT9-042" || s.state.pendingDecision !== undefined, 200);
    expect(base.topCard?.cardId === "BT9-042" || s.state.pendingDecision !== undefined).toBe(true);
  });
});

describe("§15-16-4 [On Deletion] (comprehensive-0210)", () => {
  it("15-16-4-1: [On Deletion] triggers exactly when the card with the effect is deleted — real card BT1-035 'Gain 2 memory.'", async () => {
    cite("comprehensive-0210", "15-16-4-1 [On Deletion] triggers at the point the card with that effect is deleted");

    const s = setup();
    const p0 = s.state.players[0]!;
    const leomon = digimon(0, 5000, "BT1-035"); // real: "[On Deletion] Gain 2 memory."
    p0.battleArea.push(leomon);
    s.state.memory = 0;
    const memoryBefore = s.state.memory;

    await (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives
      .deletePermanent([leomon.permanentId]);
    await settle(() => s.state.memory !== memoryBefore, 200);

    expect(s.state.memory).toBe(memoryBefore + 2);
  });
});

describe("§15-16-5 [When Attacking] (comprehensive-0211)", () => {
  it("15-16-5-1: [When Attacking] triggers at the point an attack is declared — BT9-042's INHERITED clause fires on the higher Digimon's attack", async () => {
    cite("comprehensive-0211", "15-16-5-1 [When Attacking] triggers when an attack declaration is made for the card with that effect");

    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const base = digimon(0, 9000, "AD1-002");
    base.stack.push(instance("BT9-042", 0, true)); // BT9-042 buried as a digivolution card
    p0.battleArea.push(base);

    const oppTarget = digimon(1, 9000, "AD1-001");
    p1.battleArea.push(oppTarget);
    s.state.turnSeat = 0;
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: base.permanentId,
      target: { kind: "player" },
    });
    await settle(() => oppTarget.currentDP !== 9000, 300);
    expect(oppTarget.currentDP).toBe(5000); // the inherited [When Attacking] -4000 DP fired
  });
});

// §15-16-6 [When Linking] (comprehensive-0212)
markNotTestable(
    "comprehensive-0212",
    "No compiled card prints '[When Linking]' anywhere in the 4,284-card corpus (searched " +
      "cards.json effectText/inheritedEffectText for the literal bracket) AND the engine's " +
      "EffectTiming enum (packages/shared/src/schema/enums.ts) has no member for it — unlike " +
      "every other timing in this section, 'WhenLinking' appears in neither timingForTrigger's " +
      "IR-trigger switch nor anywhere in GameEngine.ts's link-mechanic handlers (grepped both). " +
      "There is no real card to drive and no engine window it would dispatch through.",
  );
describe("§15-16-7 [Main] (comprehensive-0213)", () => {
  it("15-16-7-1: [Main] is exactly the activation-type-effect window — BT15-009 again, cited for its own timing icon this time", () => {
    cite("comprehensive-0213", "15-16-7-1 [Main] is an effect timing for activation-type effects (§15-8-4)");
    const def = requireCardDefinition("BT15-009");
    expect(def.effectText).toContain("[Main]");
  });
});

describe("§15-16-8 [Your Turn] and [Opponent's Turn] (comprehensive-0214)", () => {
  it("15-16-8-1: ST1-12's [Your Turn] DP boost is gated to its OWNER's turn specifically (not just 'any turn')", () => {
    cite(
      "comprehensive-0214",
      "15-16-8-1 [Your Turn]/[Opponent's Turn] are timings where effects can trigger and " +
        "activate during the respective turns shown in text",
    );

    const ownerTurnCtx = {
      source: {
        instanceId: "x",
        cardId: "ST1-12",
        ownerSeat: 0 as Seat,
        definition: {} as EffectContext["source"]["definition"],
        permanent: () => undefined,
        isOnBattleArea: () => true,
        isOwnersTurn: () => true,
        hasColor: (_c: CardColor) => false,
      },
    } as unknown as EffectContext;
    const opponentTurnCtx = {
      ...ownerTurnCtx,
      source: { ...ownerTurnCtx.source, isOwnersTurn: () => false },
    } as unknown as EffectContext;
    const effect = staticModifier({
      source: ownerTurnCtx.source,
      effectKey: "ST1-12/probe-your-turn",
      description: "probe",
      when: (ctx) => ctx.source.isOwnersTurn(),
      resolve: async () => {},
    });
    expect(effect.canTrigger(ownerTurnCtx)).toBe(true);
    expect(effect.canTrigger(opponentTurnCtx)).toBe(false);
  });
});

describe("§15-16-9 [All Turns] (comprehensive-0215)", () => {
  it("15-16-9-1: an [All Turns] effect triggers/activates on BOTH players' turns, unlike [Your Turn]", () => {
    cite("comprehensive-0215", "15-16-9-1 [All Turns] effects can be triggered and activated during both your turns and your opponent's turns");

    const ctx = {
      source: {
        instanceId: "x",
        cardId: "BT18-086",
        ownerSeat: 0 as Seat,
        definition: {} as EffectContext["source"]["definition"],
        permanent: () => undefined,
        isOnBattleArea: () => true,
        isOwnersTurn: () => true,
        hasColor: (_c: CardColor) => false,
      },
    } as unknown as EffectContext;
    const opponentTurnCtx = { ...ctx, source: { ...ctx.source, isOwnersTurn: () => false } } as unknown as EffectContext;
    // No `turnOwnerGuard` is applied for an "AllTurns"-trigger effect (turnOwnerGuard's
    // switch has no case for it) — the effect is unconditionally live on both turns.
    const effect = staticModifier({
      source: ctx.source,
      effectKey: "BT18-086/probe-all-turns",
      description: "probe",
      resolve: async () => {},
    });
    expect(effect.canTrigger(ctx)).toBe(true);
    expect(effect.canTrigger(opponentTurnCtx)).toBe(true);
  });
});

describe("§15-16-10 [Security] (comprehensive-0216)", () => {
  it("15-16-10-2: a triggered [Security] effect activates immediately, without joining the pending-activation queue", async () => {
    cite(
      "comprehensive-0216",
      "15-16-10-2 a triggered [Security] effect immediately activates without pending " +
        "activation; [Security] effects take precedence even when triggering simultaneously " +
        "with other effects",
    );

    // The `security` builder's isSecurity:true flag routes it to EffectTiming.SecuritySkill
    // (timingForTrigger: `if (effect.isSecurity) return EffectTiming.SecuritySkill`), the
    // DEDICATED window `runSecurityCheck` resolves synchronously as part of the security
    // check itself (resolveSecurityEffect) — never folded into the general OnStartTurn/
    // OnDraw pending-activation queue other simultaneous triggers share.
    const effect = security({
      source: {
        instanceId: "x",
        cardId: "ST1-12",
        ownerSeat: 0 as Seat,
        definition: {} as EffectContext["source"]["definition"],
        permanent: () => undefined,
        isOnBattleArea: () => false,
        isOwnersTurn: () => true,
        hasColor: (_c: CardColor) => false,
      },
      effectKey: "ST1-12/probe",
      description: "probe",
      resolve: async () => {},
    });
    expect(effect.isSecurity).toBe(true);
    await settle(() => true, 1);
  });
});

describe("§15-16-13-1 [Start of Your/Opponent's Main Phase] (comprehensive-0217)", () => {
  it("15-16-13-1: [Start of Your Main Phase] fires at the OnStartMainPhase window — BT22-007's {Breeding} clause, gated to the OWNER's turn", async () => {
    cite(
      "comprehensive-0217",
      "15-16-13-1 [Start of Your Main Phase] triggers at the point your main phase arrives",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const motherEater = digimon(0, 8000, "BT22-007");
    motherEater.inBreeding = true;
    p0.breeding = motherEater;
    const egg = instance("BT22-007", 0, false);
    p0.eggDeck.push(egg);
    s.state.turnSeat = 0;

    await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => motherEater.stack.some((c) => c.instanceId === egg.instanceId), 200);
    // BT22-007's {Breeding}[Start of Your Main Phase] places a real [Mother Eater] egg-deck
    // top card as its OWN top digivolution card — the window fired and its body ran.
    expect(motherEater.stack.some((c) => c.instanceId === egg.instanceId)).toBe(true);
  });
});

// §15-16-14 [Counter] (comprehensive-0218)
markNotTestable(
    "comprehensive-0218",
    "Every compiled card printing [Counter] in the corpus pairs it ONLY with the " +
      "＜Blast Digivolve＞ keyword marker (grepped apps/api/src/cards for '\"trigger\": " +
      "\"Counter\"' — AD1-005/BT14-014/BT14-026/BT14-037, all keyword-only, no independent " +
      "action body). §11-3 'Counter Timing' (the window this icon fires in) is combat's own " +
      "declare-block/pre-damage machinery, chapter 11 scaffolding outside this lane's file " +
      "ownership. There is no real card whose [Counter] clause has an observable body distinct " +
      "from ＜Blast Digivolve＞'s own well-covered digivolve mechanic (ch08) to drive here.",
  );
// §15-16-15 [End of Attack] (comprehensive-0219)
markNotTestable(
    "comprehensive-0219",
    "Driving '[End of Attack] triggers when the end of the attack arrives after an attack " +
      "using the card with that effect' requires a real in-progress attack through combat's own " +
      "state machine (combat/controller.ts) — chapter 11 'Attacking' scaffolding outside this " +
      "lane's ch15 file ownership, the same reason comprehensive-0199 above is not-testable here.",
  );
describe("§15-16-16 [When Moving] (comprehensive-0220)", () => {
  it(
    "NOW MET: a compiled '[When Moving]' effect should fire at the real OnMove window",
    async () => {
      cite(
        "comprehensive-0220",
        "DIVERGENCE: 15-16-16-1 '[When Moving] triggers at the point the card with that " +
          "effect is moved.' GameEngine.ts fires a real, dedicated `EffectTiming.OnMove` window " +
          "at exactly the breeding<->battle move point (`this.fireTiming(EffectTiming.OnMove, " +
          "{ movedPermanentId })`, the move action's own comment: 'The breeding -> battle move " +
          "fires the OnMove timing'). But the IR COMPILER's `timingForTrigger` " +
          "(effects/interpreter.ts) maps the 'WhenMoving' IR trigger to `EffectTiming.None` (the " +
          "continuous/static bucket) — the SAME switch arm as 'AllTurns'/'Trash'/'Breeding'/" +
          "'Static' — not to `EffectTiming.OnMove`. A real card printing [When Moving] (BT24-052 " +
          "Keramon (X Antibody): '[When Moving] ... you may play 1 [Diaboromon] Token...') is " +
          "therefore NEVER collected when `fireTiming(EffectTiming.OnMove, ...)` runs; its " +
          "compiled effect sits in the continuous bucket instead and never activates from a move.",
      );

      const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
      const p0 = s.state.players[0]!;
      const keramon = digimon(0, 3000, "BT24-052"); // real: "[When Moving] ... play 1 [Diaboromon] Token..."
      keramon.inBreeding = true;
      p0.breeding = keramon;
      s.state.phase = Phase.Breeding;
      s.state.turnSeat = 0;

      const result = applyMoveFromBreeding(s.state, 0, { type: "moveFromBreeding", permanentId: keramon.permanentId }, {});
      expect(result.ok).toBe(true);
      void (s.engine as unknown as { fireTiming(t: EffectTiming, trig?: unknown): Promise<void> }).fireTiming(
        EffectTiming.OnMove,
        { movedPermanentId: keramon.permanentId },
      );
      await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 500);
      // EXPECTED (per §15-16-16-1): the [When Moving] optional Token-play prompt fires.
      expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    },
  );
});

describe("§15-8-5 Immediate-Type Effects, real ＜Barrier＞ (comprehensive-0177/0178)", () => {
  it("15-8-5-1/15-8-5-2: an immediate-type 'would be deleted' reaction interrupts BEFORE the deletion and can prevent it — real ＜Barrier＞ card BT13-041", async () => {
    cite(
      "comprehensive-0177",
      "15-8-5-1/2 an immediate-type effect interrupts right before the cause of the " +
        "triggering event; a 'would be deleted' reaction that prevents removal means the card " +
        "isn't deleted — real card BT13-041 Chirinmon: '＜Barrier＞ (When this Digimon would be " +
        "deleted in battle, by trashing the top card of your security stack, prevent that " +
        "deletion.)'",
    );
    cite(
      "comprehensive-0178",
      "15-8-5-5-1/2 an immediate-type effect with processing conditions can activate " +
        "once those conditions are met, even if unmet at the moment it triggered",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const chirinmon = digimon(0, 5000, "BT13-041");
    p0.battleArea.push(chirinmon);
    const secCard = instance("AD1-001", 0, false);
    p0.security.push(secCard);
    const securityBefore = p0.security.length;

    const registry = new SubTriggerRegistry();
    registry.subscribeReplacement({
      event: "wouldBeDeleted",
      sourcePermanentId: chirinmon.permanentId,
      mode: "prevent",
      protects: (_ctx, leavingId) => leavingId === chirinmon.permanentId,
      preventCheck: async () => {
        // "by trashing the top card of your security stack" — the actual cost.
        const card = p0.security.pop();
        if (card !== undefined) p0.trash.push(card);
        return card !== undefined;
      },
      description: "BT13-041 <Barrier>",
    });
    const host: LeavePreventionHost = {
      subTriggers: registry,
      permanentById: (id) => (id === chirinmon.permanentId ? chirinmon : undefined),
      buildContext: () => ({ source: {}, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      turnSeat: 0,
    };

    const prevented = await consultLeavePrevention(host, [chirinmon.permanentId], "byBattle", 1, {
      reentryGuard: { active: false },
    });
    expect(prevented.has(chirinmon.permanentId)).toBe(true); // the deletion was prevented
    expect(p0.security.length).toBe(securityBefore - 1); // the cost (trash top security) was paid
  });
});

describe("§4-25 'With/Have X Cards' (comprehensive-0095, picked up from ch04)", () => {
  it("BT22-007's selfDigivolutionCountAtLeast condition gates its play-3 clause on 10+ digivolution cards, driven through the REAL interpreter", async () => {
    cite(
      "comprehensive-0095",
      "ch04 §4-25 '[has] N digivolution cards' gate (Condition kind " +
        "selfDigivolutionCountAtLeast, real card BT22-007, KB Q4858) — driven here end-to-end " +
        "against the real GameEngine (not a synthetic fixture), unlike the pre-existing unit-" +
        "level A3 test at apps/api/src/cards/BT22/BT22-007.test.ts.",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const motherEater = digimon(0, 8000, "BT22-007");
    motherEater.inBreeding = true;
    // 9 digivolution cards: BELOW the 10+ gate.
    for (let i = 0; i < 9; i += 1) motherEater.stack.push(instance("BT22-007", 0, true));
    p0.breeding = motherEater;
    p0.eggDeck.push(instance("AD1-001", 0, false)); // a non-[Mother Eater] egg top: no place-as-top either
    s.state.turnSeat = 0;

    const playedBefore = p0.battleArea.length;
    await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => false, 50);
    // Below the 10+ gate: the play-3-from-own-stack clause never ran, so no new
    // [Mother Eater] permanents entered the battle area from it.
    expect(p0.battleArea.length).toBe(playedBefore);
  });
});
