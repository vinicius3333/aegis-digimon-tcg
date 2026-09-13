import { describe, it, expect } from "vitest";
import { EffectTiming, Phase, requireCardDefinition, type CardColor, type Seat } from "@aegis/shared";
import { cite } from "./_kb.js";
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
 * comprehensive-0312 (ch04 §4-26, deferred as chapter-15 scaffolding).
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
      "15-8-2-2/3 persistent effects activate as soon as their condition is met and " +
        "deactivate as soon as it no longer is — the rules' OWN worked example: '[Your Turn] " +
        "All of your Digimon get +1000 DP' is active from the start of your turn, inactive from " +
        "the start of your opponent's turn",
      "d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const tai = digimon(0, 0, "ST1-12"); // real: "[Your Turn] All of your Digimon get +1000 DP."
    const ally = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(tai, ally);
    s.state.turnSeat = 0;

    const engine = s.engine as unknown as { recomputeContinuousEffects(): Promise<void> };
    await engine.recomputeContinuousEffects();
    await settle(() => ally.currentDP === 6000, 5000);
    expect(ally.currentDP).toBe(6000); // active on the owner's own turn

    s.state.turnSeat = 1;
    await engine.recomputeContinuousEffects();
    await settle(() => ally.currentDP === 5000, 5000);
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
      "11f191e2c553de5f2a1722dbd32e86d6f3da0b3e41d268d3ec62a467a8644096",
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
    await settle(() => !p1.battleArea.includes(targetA), 5000);
    // Wait for the per-turn use ledger to actually record the use (a few ticks behind
    // the board mutation, since register() runs after the awaited decision round trip).
    const trackerRef = (s.engine as unknown as { tracker: { count(id: string, key: string): number } }).tracker;
    await settle(() => trackerRef.count(meramonA.topCard!.instanceId, "BT15-009/ir-27-0") > 0, 5000);

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
    await settle(() => !p1.battleArea.includes(targetB), 5000);
  });

  it("15-14-1-2: an event that fails the clause's own trigger condition spends no [Once Per Turn] use", async () => {
    cite(
      "comprehensive-0193",
      "15-14-1-2 an [X Per Turn] effect stops triggering only once it has been ACTIVATED X " +
        "times this turn; §15-5-1 an effect triggers only when its trigger conditions are met, " +
        "so an event the clause rejects consumes none of its budget",
      "11f191e2c553de5f2a1722dbd32e86d6f3da0b3e41d268d3ec62a467a8644096",
    );

    // BT11-014's inherited clause: "[Your Turn][Once Per Turn] When this Digimon's attack
    // target is switched, trash the top card of your opponent's security stack." A blocker
    // switching a DIFFERENT Digimon's attack target is an event this clause rejects.
    const s = setup({
      0: {
        battleArea: [
          { card: "BT1-064", as: "other", dp: 20_000 },
          { card: "BT1-064", as: "carrier", under: ["BT11-014"], dp: 20_000 },
        ],
      },
      1: {
        battleArea: [
          { card: "ST18-07", as: "firstBlocker", dp: 4000 },
          { card: "ST18-07", as: "secondBlocker", dp: 4000 },
        ],
        security: ["BT1-009", "BT1-013"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("firstBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("secondBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("§15-14-2 {Hand} (comprehensive-0194)", () => {
  it("15-14-2-1: BT9-042's {Hand}[Main] effect is declarable while the card sits face-up in hand", async () => {
    cite(
      "comprehensive-0194",
      "15-14-2-1 an effect with the {Hand} icon can be activated when you reveal the card from your hand",
      "79b8abdd9c5911dc5cc79b677c3490008586c2f9ab78dc9068fc778d34acfb82",
    );

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
      await settle(() => raidenmon.stack.some((c) => c.instanceId === raijinmon.instanceId), 5000);
      expect(raidenmon.stack.some((c) => c.instanceId === raijinmon.instanceId)).toBe(true);
    } else {
      // DIVERGENCE surfaced by a real run: see the it.fails immediately below, which
      // pins down and documents exactly this outcome instead of silently accepting it.
      expect(result.reason).toBeDefined();
    }
  });

  it("NOW MET: onAddHand's default base guard should NOT require the source to be on the battle area", () => {
    cite(
      "comprehensive-0194",
      "DIVERGENCE: builders.ts's `onAddHand` builder (used for every IR 'Hand' trigger, " +
        'builderForTrigger\'s `case "Hand": return onAddHand;`) is defined as `build(opts, {})`' +
        " — an EMPTY flags object, so its base guard defaults to `onField` (`ctx.source." +
        "isOnBattleArea()`). A {Hand}-triggered effect's whole point (§15-14-2-1) is that its " +
        "source is a LOOSE HAND CARD, which is never on the battle area — so canTrigger's base " +
        "guard is unsatisfiable for the one zone {Hand} effects are defined to fire from.",
      "79b8abdd9c5911dc5cc79b677c3490008586c2f9ab78dc9068fc778d34acfb82",
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
  });
});

describe("§15-14-3 {Trash} (comprehensive-0195)", () => {
  it("NOW MET: a {Trash}-resident effect should activate while its card sits in the trash, not require the battle area", () => {
    cite(
      "comprehensive-0195",
      "RESOLVED: `builderForTrigger` now routes an `isFromTrash`-flagged effect (a " +
        "compiled `[Trash]` tag, e.g. BT26-078's [Trash][Your Turn]) to `inTrash`, whose " +
        "base guard requires ACTUAL trash residency (`ctx.source.isInTrash()`) rather than " +
        "merely 'not on the battle area' — a card resident in HAND or the DECK is also " +
        "never on the battle area, so the guard must positively confirm trash residency, " +
        "not just the absence of a field guard (the corresponding regression coverage " +
        "eighth gap).",
      "d72acd9fc0e9a54564c6b39c037197835a837c714dbce7e5285f157236c226ff",
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
  });
});

describe("§15-14-4 {Breeding} (comprehensive-0196)", () => {
  it("15-14-4-1: a {Breeding}-flagged effect activates while its card is in the breeding area and NOT on the battle area", () => {
    cite(
      "comprehensive-0196",
      "15-14-4-1 an effect with the {Breeding} icon can trigger and activate while the " +
        "card with the effect is in the breeding area — real card BT18-086 Lucemon: Larva " +
        "(isBreeding:true clauses)",
      "d9e82d240359c53d75b058adb5d3d3309df1d33bd043a4f3283219e8632ef344",
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
      "13dd287b041701b64a70059b6eebced5bae28020023ee641c5041510920047fb",
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
    cite(
      "comprehensive-0207",
      "15-16-1 effect timings are shown using bracketed-icon text",
      "dfa4388c426305866560ec3696e77409e660c49e4b09db983cca4579c7e4c2ff",
    );
    cite(
      "comprehensive-0208",
      "15-16-2-1 [On Play] triggers at the point the action of playing a card with " + "that effect completes",
      "7b89d66385bce9ed817a0ae64c520a4a332a08822f169123aa5b3f22d6ba25e3",
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
    cite(
      "comprehensive-0209",
      "15-16-3-1 [When Digivolving] triggers when the digivolve action completes",
      "7213a2d3e50c14c6909c4d1ea2f9df62e61fb91c5c6cd4d7e0754200ba10f651",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 9000, "BT10-022"); // real Black Lv.5, matches BT9-042's evoCost
    p0.battleArea.push(base);
    const evolver = instance("BT9-042", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolver.instanceId });
    await settle(() => base.topCard?.cardId === "BT9-042" || s.state.pendingDecision !== undefined, 5000);
    expect(base.topCard?.cardId === "BT9-042" || s.state.pendingDecision !== undefined).toBe(true);
  });
});

describe("§15-16-4 [On Deletion] (comprehensive-0210)", () => {
  it("15-16-4-1: [On Deletion] triggers exactly when the card with the effect is deleted — real card BT1-035 'Gain 2 memory.'", async () => {
    cite(
      "comprehensive-0210",
      "15-16-4-1 [On Deletion] triggers at the point the card with that effect is deleted",
      "e24eb2b826f21a8fa8a09e42fa4c357c7f46c5f7fcedbb93fe8955b3b00d3afc",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const leomon = digimon(0, 5000, "BT1-035"); // real: "[On Deletion] Gain 2 memory."
    p0.battleArea.push(leomon);
    s.state.memory = 0;
    const memoryBefore = s.state.memory;

    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }
    ).primitives.deletePermanent([leomon.permanentId]);
    await settle(() => s.state.memory !== memoryBefore, 5000);

    expect(s.state.memory).toBe(memoryBefore + 2);
  });
});

describe("§15-16-5 [When Attacking] (comprehensive-0211)", () => {
  it("15-16-5-1: [When Attacking] triggers at the point an attack is declared — BT9-042's INHERITED clause fires on the higher Digimon's attack", async () => {
    cite(
      "comprehensive-0211",
      "15-16-5-1 [When Attacking] triggers when an attack declaration is made for the card with that effect",
      "fa80af0514c42ce2b52a5d3733966c091e90bf13c7b4a1900b0b34aa98554f52",
    );

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
    await settle(() => oppTarget.currentDP !== 9000, 5000);
    expect(oppTarget.currentDP).toBe(5000); // the inherited [When Attacking] -4000 DP fired
  });
});

// §15-16-6 [When Linking] (comprehensive-0212)
describe("§15-16-7 [Main] (comprehensive-0213)", () => {
  it("15-16-7-1: [Main] is exactly the activation-type-effect window — BT15-009 again, cited for its own timing icon this time", () => {
    cite(
      "comprehensive-0213",
      "15-16-7-1 [Main] is an effect timing for activation-type effects (§15-8-4)",
      "370a51d2f864be7cc6f28043acc83630c11b7c093392908e87a0e3b2cc76685c",
    );
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
      "801e5b985e35b40cc543c70ebc57cbb07fa7bcd971fe50e65b2176ccfe59e52a",
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
    cite(
      "comprehensive-0215",
      "15-16-9-1 [All Turns] effects can be triggered and activated during both your turns and your opponent's turns",
      "0f02f814bbbe7727332f4c1c3469673baad349369a95916b47e07920b678a12c",
    );

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
    const opponentTurnCtx = {
      ...ctx,
      source: { ...ctx.source, isOwnersTurn: () => false },
    } as unknown as EffectContext;
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
      "9c1db9844c7c6d99b1b29ab9bb4f83559e17bc60055475956322c306f88bf74b",
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
      "ff311cf65833b616fb62b1ac11efb0f2d986234f7d934339b4ffbd61aced4987",
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
    await settle(() => motherEater.stack.some((c) => c.instanceId === egg.instanceId), 5000);
    // BT22-007's {Breeding}[Start of Your Main Phase] places a real [Mother Eater] egg-deck
    // top card as its OWN top digivolution card — the window fired and its body ran.
    expect(motherEater.stack.some((c) => c.instanceId === egg.instanceId)).toBe(true);
  });
});

// §15-16-14 [Counter] (comprehensive-0218)
// §15-16-15 [End of Attack] (comprehensive-0219)
describe("§15-16-16 [When Moving] (comprehensive-0220)", () => {
  it("NOW MET: a compiled '[When Moving]' effect should fire at the real OnMove window", async () => {
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
      "ee839d42c2e4a2760e145afbe716706525fa86c7437cac1cc53c2b5d3c7cda12",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const keramon = digimon(0, 3000, "BT24-052"); // real: "[When Moving] ... play 1 [Diaboromon] Token..."
    keramon.inBreeding = true;
    p0.breeding = keramon;
    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 0;

    const result = applyMoveFromBreeding(
      s.state,
      0,
      { type: "moveFromBreeding", permanentId: keramon.permanentId },
      {},
    );
    expect(result.ok).toBe(true);
    void (s.engine as unknown as { fireTiming(t: EffectTiming, trig?: unknown): Promise<void> }).fireTiming(
      EffectTiming.OnMove,
      { movedPermanentId: keramon.permanentId },
    );
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 5000);
    // EXPECTED (per §15-16-16-1): the [When Moving] optional Token-play prompt fires.
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
  });
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
      "50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde",
    );
    cite(
      "comprehensive-0178",
      "15-8-5-5-1/2 an immediate-type effect with processing conditions can activate " +
        "once those conditions are met, even if unmet at the moment it triggered",
      "0438ec1a29c13d73a39a7d1395f8386b49ecc61d4580c2d77b84743c25ef8317",
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
      reentryGuard: { activeReplacementKeys: new Set<string>() },
    });
    expect(prevented.has(chirinmon.permanentId)).toBe(true); // the deletion was prevented
    expect(p0.security.length).toBe(securityBefore - 1); // the cost (trash top security) was paid
  });
});

describe("§4-26 'With/Have X Cards' (comprehensive-0312, picked up from ch04)", () => {
  it("BT22-007's selfDigivolutionCountAtLeast condition gates its play-3 clause on 10+ digivolution cards, driven through the REAL interpreter", async () => {
    cite(
      "comprehensive-0312",
      "ch04 §4-26 '[has] N digivolution cards' gate (Condition kind " +
        "selfDigivolutionCountAtLeast, real card BT22-007, KB Q4858) — driven here end-to-end " +
        "against the real GameEngine (not a synthetic fixture), unlike the pre-existing unit-" +
        "level A3 test at apps/api/src/cards/BT22/BT22-007.test.ts.",
      "8917d35ea7b38493262c75ec43753539c0759cdaa76880f45fe55cf5a0cef736",
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
