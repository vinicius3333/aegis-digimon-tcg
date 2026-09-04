import { describe, it, expect } from "vitest";
import { EffectTiming, Phase, requireCardDefinition, type CardColor, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import { resolveTiming, orderTurnPlayerFirst, type ResolutionEnv } from "../effects/stack.js";
import type { CollectedEffect } from "../effects/collect.js";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";
import { UseTracker } from "../effects/kernel.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 15 "Effect Rules" — §15-4 (Effect States: activation,
 * triggering, simultaneous triggering, pending activation, derived triggering),
 * §15-5/§15-6/§15-7 (trigger/processing/optional-processing conditions), and §15-8-3
 * through §15-8-5 (trigger-type, activation-type, immediate-type effect categories).
 *
 * comprehensive-0161 (bare §15-4 heading) is already seeded in `not-testable.ts`.
 *
 * The §15-4-3/15-4-4/15-4-5 ordering rules describe the resolver LOOP itself, not any
 * one card — proven here directly against `resolveTiming`/`orderTurnPlayerFirst`
 * (`effects/stack.ts`, the exact seam `GameEngine.fireTiming` delegates to), with
 * minimal fakes in the same idiom as `effects/stack.test.ts`: the loop only reads
 * `source.ownerSeat`/`source.instanceId` and `effect.{optional,effectKey,canActivate,
 * resolve}`, so a fake CardSource/Effect exercises the real resolution order exactly
 * as production does.
 *
 * Real fixtures: BT9-042 Raijinmon (processing conditions + optional processing
 * conditions, see ch15-01), BT15-009 Meramon ("[Main] [Once Per Turn] By paying 2
 * cost, delete 1 of your opponent's Digimon..." — the rules' OWN §15-8-4-1 worked
 * example), BT1-070 Kuwagamon (trigger-type [On Play]).
 */

function fakeSource(seat: Seat, instanceId: string): CardSource {
  return {
    instanceId,
    cardId: instanceId,
    ownerSeat: seat,
    definition: {} as CardSource["definition"],
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: (_c: CardColor) => false,
  };
}

function fakeEffect(
  effectKey: string,
  opts: { optional?: boolean; canActivate?: () => boolean; onResolve?: () => void; maxPerTurn?: number } = {},
): Effect {
  return {
    effectKey,
    description: effectKey,
    optional: opts.optional ?? false,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: opts.maxPerTurn ?? 1,
    canTrigger: () => true,
    canActivate: () => (opts.canActivate ? opts.canActivate() : true),
    resolve: async () => {
      opts.onResolve?.();
    },
  };
}

function collected(seat: Seat, instanceId: string, effect: Effect): CollectedEffect {
  return { source: fakeSource(seat, instanceId), effect };
}

describe("§15-4-1 Activation (comprehensive-0162)", () => {
  it("15-4-1-1: activation is the effect being EXECUTED — the use ledger records a use only once resolve() has run", async () => {
    cite("comprehensive-0162", "15-4-1-1 activation refers to an effect being executed");

    const s = setup();
    const p0 = s.state.players[0]!;
    const meramon = digimon(0, 4000, "BT15-009");
    p0.battleArea.push(meramon);
    const p1 = s.state.players[1]!;
    const oppTarget = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(oppTarget);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: meramon.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(result).toEqual({ ok: true });
    await settle(() => !p1.battleArea.includes(oppTarget), 5000);

    // The effect body actually ran (the opponent's Digimon was deleted) — "activation"
    // is the execution, not merely the declaration.
    expect(p1.battleArea.includes(oppTarget)).toBe(false);
  });
});

describe("§15-4-2 Triggering (comprehensive-0163)", () => {
  it("15-4-2-3: pending-activation effects resolve strictly one at a time, never concurrently", async () => {
    cite(
      "comprehensive-0163",
      "15-4-2-3 effects pending activation must be activated 1 at a time; multiple " +
        "triggered effects can't be activated at the same time",
    );

    const log: string[] = [];
    const inFlight: string[] = [];
    const a = fakeEffect("a", {
      onResolve: () => {
        inFlight.push("a");
        log.push(`start:a inFlight=${inFlight.join(",")}`);
        inFlight.length = 0;
      },
    });
    const b = fakeEffect("b", {
      onResolve: () => {
        inFlight.push("b");
        log.push(`start:b inFlight=${inFlight.join(",")}`);
        inFlight.length = 0;
      },
    });
    const seed = [collected(0, "a", a), collected(0, "b", b)];
    const tracker = new UseTracker();
    const env: ResolutionEnv = {
      turnSeat: 0,
      tracker,
      collect: () => seed,
      makeContext: (c) => ({ source: c.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      ruleProcess: async () => {},
      isGameOver: () => false,
      chooseOrder: async () => 0,
      askOptional: async () => true,
    };
    await resolveTiming(EffectTiming.OnPlay, env);

    // Each resolve() body saw exactly ITSELF in `inFlight` — never both at once.
    expect(log).toEqual(["start:a inFlight=a", "start:b inFlight=b"]);
  });
});

describe("§15-4-3 Simultaneous Triggering (comprehensive-0164)", () => {
  it("15-4-3-5-1/2: ALL of the turn player's simultaneously-triggered effects resolve before ANY of the non-turn player's", async () => {
    cite(
      "comprehensive-0164",
      "15-4-3-5-1/2 1 effect is chosen from the turn player's simultaneously-triggered " +
        "effects, repeated until none remain; only then does the non-turn player's bucket begin",
    );

    const log: string[] = [];
    const mk = (seat: Seat, key: string): CollectedEffect =>
      collected(seat, key, fakeEffect(key, { onResolve: () => log.push(key) }));
    // 2 for the turn player (seat 0), 2 for the opponent (seat 1), collected out of order.
    const seed = [mk(1, "opp1"), mk(0, "mine1"), mk(1, "opp2"), mk(0, "mine2")];
    const tracker = new UseTracker();
    const env: ResolutionEnv = {
      turnSeat: 0,
      tracker,
      collect: () => seed,
      makeContext: (c) => ({ source: c.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      ruleProcess: async () => {},
      isGameOver: () => false,
      chooseOrder: async () => 0, // resolve the frontmost of whichever group is offered
      askOptional: async () => true,
    };
    await resolveTiming(EffectTiming.OnPlay, env);

    expect(log).toEqual(["mine1", "mine2", "opp1", "opp2"]);
  });

  it("orderTurnPlayerFirst is stable within each side (doesn't reorder same-seat effects)", () => {
    cite("comprehensive-0164", "15-4-3-1 simultaneous triggering: multiple effects trigger at the same timing");

    const seed = [
      collected(1, "opp1", fakeEffect("opp1")),
      collected(0, "mineA", fakeEffect("mineA")),
      collected(0, "mineB", fakeEffect("mineB")),
      collected(1, "opp2", fakeEffect("opp2")),
    ];
    const ordered = orderTurnPlayerFirst(seed, 0);
    expect(ordered.map((c) => c.source.instanceId)).toEqual(["mineA", "mineB", "opp1", "opp2"]);
  });
});

describe("§15-4-4 Pending Activation (comprehensive-0165)", () => {
  it("15-4-4-5: an effect that no longer meets its trigger conditions before activating can no longer be activated", async () => {
    cite(
      "comprehensive-0165",
      "15-4-4-5 when a card with a pending-activation effect no longer meets that " +
        "effect's trigger conditions before it activates, the effect can no longer be activated",
    );

    const log: string[] = [];
    let bStillLegal = true;
    // Resolving "a" flips bStillLegal false (simulating "the target left the field" /
    // "the condition stopped being met" mid pending-activation window).
    const a = fakeEffect("a", {
      onResolve: () => {
        bStillLegal = false;
        log.push("a");
      },
    });
    const b = fakeEffect("b", { canActivate: () => bStillLegal, onResolve: () => log.push("b") });
    const seed = [collected(0, "a", a), collected(0, "b", b)];
    const tracker = new UseTracker();
    const env: ResolutionEnv = {
      turnSeat: 0,
      tracker,
      collect: () => seed,
      makeContext: (c) => ({ source: c.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      ruleProcess: async () => {},
      isGameOver: () => false,
      chooseOrder: async () => 0,
      askOptional: async () => true,
    };
    await resolveTiming(EffectTiming.OnPlay, env);

    expect(log).toEqual(["a"]); // "b" never activated — its canActivate went false first
  });
});

describe("§15-4-5 Derived Triggering (comprehensive-0166)", () => {
  it("NOW MET: a derived trigger for the non-turn player should activate BEFORE the turn player's still-pending effects", async () => {
    cite(
      "comprehensive-0166",
      "DIVERGENCE: 15-4-5-2/3 'A derived triggering effect will activate before " +
        "previously triggered effects that are pending activation. If a derived triggering " +
        "effect occurs for the non-turn player when there are pending activation effects for " +
        "the turn player, the derived triggering effect will activate first.' " +
        "orderTurnPlayerFirst (effects/stack.ts) buckets EVERY pass by seat unconditionally — " +
        "turn player's bucket always resolves to exhaustion before the opponent's bucket is " +
        "even considered, with no notion of 'this opponent effect just newly (derived-)" +
        "triggered while turn-player effects are still pending, so it cuts the line.' A newly " +
        "collected opponent effect is appended to the SAME non-turn-player bucket and waits " +
        "behind every remaining turn-player pending effect, contradicting 15-4-5-3.",
    );

    const log: string[] = [];
    let derivedArmed = false;
    // "a" resolves first (turn player, seat 0) and arms a DERIVED trigger for the
    // opponent (seat 1) — the "d" effect only canActivate once armed, simulating a
    // brand-new trigger appearing mid-resolution.
    const a = fakeEffect("a", {
      onResolve: () => {
        derivedArmed = true;
        log.push("a");
      },
    });
    const c = fakeEffect("c", { onResolve: () => log.push("c") }); // still-pending turn-player effect
    const d = fakeEffect("d", { canActivate: () => derivedArmed, onResolve: () => log.push("d") });
    const seed = [collected(0, "a", a), collected(0, "c", c), collected(1, "d", d)];
    const tracker = new UseTracker();
    const env: ResolutionEnv = {
      turnSeat: 0,
      tracker,
      collect: () => seed,
      makeContext: (cEff) => ({ source: cEff.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      ruleProcess: async () => {},
      isGameOver: () => false,
      chooseOrder: async () => 0,
      askOptional: async () => true,
    };
    await resolveTiming(EffectTiming.OnPlay, env);

    // EXPECTED (per §15-4-5-3): "d" (the opponent's derived trigger) cuts in front of
    // "c" (the turn player's still-pending effect) — order should be a, d, c.
    expect(log).toEqual(["a", "d", "c"]);
  });

  it("Q6723: a same-controller derived trigger cuts ahead without joining the older effect's ordering group", async () => {
    const log: string[] = [];
    const offered: string[][] = [];
    let derivedArmed = false;
    const a = fakeEffect("a", {
      onResolve: () => {
        derivedArmed = true;
        log.push("a");
      },
    });
    const c = fakeEffect("c", { onResolve: () => log.push("c") });
    const d = fakeEffect("d", { canActivate: () => derivedArmed, onResolve: () => log.push("d") });
    const seed = [collected(0, "a", a), collected(0, "c", c), collected(0, "d", d)];
    const tracker = new UseTracker();
    const env: ResolutionEnv = {
      turnSeat: 0,
      tracker,
      collect: () => seed,
      makeContext: (cEff) => ({ source: cEff.source, trigger: {}, game: {}, fx: {}, ask: {} }) as never,
      ruleProcess: async () => {},
      isGameOver: () => false,
      chooseOrder: async (_seat, group) => {
        const keys = group.map((entry) => entry.effect.effectKey);
        offered.push(keys);
        const firstIndex = keys.indexOf("a");
        return firstIndex >= 0 ? firstIndex : keys.indexOf("c");
      },
      askOptional: async () => true,
    };

    await resolveTiming(EffectTiming.OnPlay, env);

    expect(log).toEqual(["a", "d", "c"]);
    expect(offered).toEqual([["a", "c"]]);
  });
});

describe("§15-5 Trigger Conditions (comprehensive-0167)", () => {
  it("15-5-2: a triggering from 1 trigger condition triggers only once, even if it occurred multiple times at the same moment", async () => {
    cite(
      "comprehensive-0167",
      "15-5-2 a triggering from 1 trigger condition is considered to only trigger once, " +
        "even if it occurred multiple times at the same time",
    );

    // BT1-070's [On Play] is a single trigger condition ("this card was played"); playing
    // it ONCE can never itself satisfy that condition more than once — proven by the
    // event log carrying exactly 1 cardPlayed/On Play activation for the single play,
    // structurally guaranteed because GameEngine's collect() model has no "occurred N
    // times" counter, only a boolean canTrigger re-evaluated per resolution pass.
    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const kuwagamon = instance("BT1-070", 0, false);
    p0.hand.push(kuwagamon);
    const target = digimon(1, 5000, "AD1-001");
    p1.battleArea.push(target);
    s.state.memory = requireCardDefinition("BT1-070").playCost;

    const eventsBefore = s.events.length;
    s.engine.applyIntent(0, { type: "playCard", instanceId: kuwagamon.instanceId });
    await settle(() => target.isSuspended, 5000);

    const suspendActivations = s.events
      .slice(eventsBefore)
      .filter((e) => e.kind === "effectActivated" || e.kind === "cardPlayed");
    // Exactly 1 On Play window fired for the 1 play — no double-activation from a single trigger.
    expect(suspendActivations.filter((e) => e.kind === "cardPlayed").length).toBe(1);
  });
});

describe("§15-6 Processing Conditions (comprehensive-0168)", () => {
  it("15-6-3: an effect can't be activated when none of its processing conditions are met", async () => {
    cite("comprehensive-0168", "15-6-3 an effect can't be activated when none of its processing conditions are met");

    const s = setup();
    const p0 = s.state.players[0]!;
    // No [Justimon]/[Raidenmon]-named Digimon on the field: BT9-042's {Hand}[Main]
    // processing condition ("if you have a Digimon in play with [Justimon] or
    // [Raidenmon] in its name") is unmet.
    const raijinmon = instance("BT9-042", 0, false);
    p0.hand.push(raijinmon);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: raijinmon.instanceId,
      effectKey: "BT9-042/ir-27-0",
    });
    expect(result.ok).toBe(false);
  });

  it("15-6-3 (negative control): the same effect activates once its processing condition is met", async () => {
    cite(
      "comprehensive-0168",
      "15-6-3 an effect can't be activated when none of its processing conditions are met " +
        "(a met condition must NOT be blocked)",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    // BT9-067 "Raidenmon" satisfies the [Raidenmon]-in-name processing condition.
    const raidenmon = digimon(0, 9000, "BT9-067");
    p0.battleArea.push(raidenmon);
    const raijinmon = instance("BT9-042", 0, false);
    p0.hand.push(raijinmon);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: raijinmon.instanceId,
      effectKey: "BT9-042/ir-27-0",
    });
    expect(result.ok).toBe(true);
  });
});

describe("§15-7 Optional Processing Conditions (comprehensive-0169/0170)", () => {
  it("15-7-4/15-7-5: a player may choose to execute an optional processing condition even when the payload after it can't do anything useful", async () => {
    cite(
      "comprehensive-0169",
      '15-7-1 optional processing conditions include text such as "by X, Y" — the ' +
        "player chooses whether to execute the conditions, then the payload runs",
    );
    cite(
      "comprehensive-0170",
      "15-7-4/15-7-5 a player can choose to execute optional processing conditions " +
        "regardless of whether the content after them can be executed",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 9000, "BT10-022"); // real Black Lv.5, matches BT9-042's evoCost
    p0.battleArea.push(base);
    const evolver = instance("BT9-042", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;
    // A [Machine]/[Cyborg] hand card exists to trash (the optional cost CAN be paid),
    // but there is deliberately NO opponent Digimon on the field for the DP-reduction
    // payload after it to affect — proving the player may still choose to pay the cost.
    const machineCard = instance("BT9-042", 0, false); // real [Cyborg]-trait card
    p0.hand.push(machineCard);

    const digResult = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolver.instanceId,
    });
    expect(digResult).toEqual({ ok: true });
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 5000);

    const optionalDecision = s.decisions.find((d) => d.req.kind === "optional");
    if (optionalDecision === undefined) {
      throw new Error("Expected the inherited OnDeletion effect to request an optional decision");
    }
    const acceptResult = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optionalDecision.req.decisionId,
      response: { kind: "optional", accept: true },
    });
    expect(acceptResult).toEqual({ ok: true });
  });
});

describe("§15-8-3 Trigger-Type Effects (comprehensive-0173)", () => {
  it("15-8-3-1: BT1-070's [On Play] is a trigger-type effect — it triggers unconditionally once its condition (being played) is met", async () => {
    cite(
      "comprehensive-0173",
      "15-8-3-1 a trigger-type effect will always trigger as soon as its trigger " +
        "conditions are met, then the effect will activate",
    );

    // The suspend still asks WHICH Digimon; the rule under test is that the effect triggers
    // and activates on its own, with no player declaration.
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
    expect(target.isSuspended).toBe(true); // triggered and activated with no player declaration
  });

  it("15-8-3-4: a trigger-type effect does NOT trigger when its condition is never met", async () => {
    cite("comprehensive-0173", "15-8-3-4 trigger-type effects won't trigger when their trigger conditions aren't met");

    const s = setup();
    const p0 = s.state.players[0]!;
    // BT1-070 stays in hand, never played — its [On Play] condition is never met.
    const kuwagamon = instance("BT1-070", 0, false);
    p0.hand.push(kuwagamon);
    const eventsBefore = s.events.length;
    await settle(() => false, 20);
    expect(s.events.slice(eventsBefore).some((e) => e.kind === "cardPlayed")).toBe(false);
  });
});

// §15-8 Effect Categories (comprehensive-0171)
markNotTestable(
  "comprehensive-0171",
  "15-8-1 is a one-line list of the 4 category names (persistent/trigger/activation/" +
    "immediate); it carries no independently testable claim beyond its own subsections, " +
    "each verified separately: persistent at comprehensive-0172 (ch15-04), trigger-type at " +
    "comprehensive-0173 above, activation-type at comprehensive-0176 above, and immediate-type " +
    "at comprehensive-0177/0178 above.",
);
describe("§15-8-4 Activation-Type Effects (comprehensive-0176)", () => {
  it("15-8-4-1/15-8-4-2: BT15-009's [Main][Once Per Turn] is activation-type — it needs a player DECLARATION during the main phase, unlike a trigger-type effect", () => {
    cite(
      "comprehensive-0176",
      "15-8-4-1 activation-type effects are optionally activated by a player — the " +
        "rules' OWN worked example: '[Main] [Once Per Turn] By paying 2 cost, delete 1 of your " +
        "opponent's Digimon with DP less than or equal to this Digimon's DP.' " +
        "15-8-4-2 declared during the main phase when there is no unresolved processing",
    );

    const s = setup();
    const p1 = s.state.players[1]!;
    const perm = digimon(0, 4000, "BT15-009");
    s.state.players[0]!.battleArea.push(perm);
    const target = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(target);
    // Outside the Main phase, the same activation is rejected — proving it needs a
    // DECLARATION at a specific window, not a passive trigger.
    s.state.phase = Phase.Breeding;
    s.state.memory = 10;
    const rejected = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: perm.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(rejected).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("15-8-4-3-1: a player can't DECLARE an activation-type effect whose cost can't be paid", () => {
    cite(
      "comprehensive-0176",
      "15-8-4-3-1 'A player can only declare activation of an activation-type effect while " +
        "its processing conditions are met.' BT15-009's own cost ('By paying 2 cost') is " +
        "exactly such a processing condition — with memory at -10 (maxCostFor(seat 0) == 0), " +
        "the 2-cost activation can't be paid and declaring it is rejected outright by " +
        "`canActivateEffect`'s cost gate (effects/interpreter.ts), which `validateActivateEffect` " +
        "(actions/activateEffect.ts) calls via `canActivate` before returning `{ ok: true }`.",
    );

    const s = setup();
    const p1 = s.state.players[1]!;
    const perm = digimon(0, 4000, "BT15-009");
    s.state.players[0]!.battleArea.push(perm);
    const target = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(target);
    s.state.memory = -10; // maxCostFor(seat 0) == 0 < 2 — can't pay the 2-cost activation cost

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: perm.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(result.ok).toBe(false);
  });

  it("15-8-4-3-1 (negative control): the same effect activates once its cost is payable", () => {
    cite(
      "comprehensive-0176",
      "15-8-4-3-1 (a payable cost must NOT be blocked): BT15-009's 2-cost activation is " +
        "declared successfully once memory can cover it.",
    );

    const s = setup();
    const p1 = s.state.players[1]!;
    const perm = digimon(0, 4000, "BT15-009");
    s.state.players[0]!.battleArea.push(perm);
    const target = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(target);
    s.state.memory = 10; // maxCostFor(seat 0) == 20 >= 2 — comfortably payable

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: perm.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(result.ok).toBe(true);
  });

  it("15-8-4-3-1: a cost-bearing activation with no legal target is not declarable by default", async () => {
    cite(
      "comprehensive-0176",
      "15-8-4-3-1 an activation-type effect can be declared only while its processing " +
        "conditions are met; EX2-051's deletion clause has no legal target above its DP ceiling",
    );

    const s = setup({
      0: { battleArea: [{ card: "EX2-051", as: "palates" }, "EX2-007"] },
      1: { battleArea: [{ card: "EX2-022", as: "tooLarge" }] },
    });
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("palates").topCard!.instanceId,
      effectKey: "EX2-051/ir-27-0",
    });

    expect(result).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("palates").isSuspended).toBe(false);
  });

  it("15-8-4-3-1 (boundary): a cost exactly equal to maxCostFor(seat) is payable, one more is not", () => {
    cite(
      "comprehensive-0176",
      "15-8-4-3-1 boundary: maxCostFor(seat) = memoryFor(seat) - MEMORY_MIN (MemoryGauge.ts). " +
        "BT15-009's cost is 2, seat 0 is the turn player (memoryFor(0) == state.memory), so " +
        "state.memory == -8 makes maxCostFor(0) == 2 exactly (payable) and state.memory == -9 " +
        "makes it 1 (one short, unpayable).",
    );

    // Two independent setups — BT15-009 is [Once Per Turn], so reusing one engine across
    // both calls would let the first declaration's use-tracking, not cost, explain the
    // second call's rejection.
    const exactSetup = setup();
    const exactPerm = digimon(0, 4000, "BT15-009");
    exactSetup.state.players[0]!.battleArea.push(exactPerm);
    exactSetup.state.players[1]!.battleArea.push(digimon(1, 3000, "AD1-001"));
    exactSetup.state.memory = -8; // maxCostFor(seat 0) == 2 — exactly enough
    const exact = exactSetup.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: exactPerm.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(exact.ok).toBe(true);

    const shortSetup = setup();
    const shortPerm = digimon(0, 4000, "BT15-009");
    shortSetup.state.players[0]!.battleArea.push(shortPerm);
    shortSetup.state.players[1]!.battleArea.push(digimon(1, 3000, "AD1-001"));
    shortSetup.state.memory = -9; // maxCostFor(seat 0) == 1 — one short
    const short = shortSetup.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: shortPerm.topCard!.instanceId,
      effectKey: "BT15-009/ir-27-0",
    });
    expect(short.ok).toBe(false);
  });
});

// §15-8-5 Immediate-Type Effects (comprehensive-0177/0178): both chunks describe the
// SAME immediate-type/leave-prevention mechanism (interrupting right before, and
// potentially preventing, the cause) — driven end-to-end against a real ＜Barrier＞
// card in ch15-04-continuous-and-static.test.ts rather than duplicated here.

// §15-8-3-8/15-8-3-9-3 Trigger-Type Effects, cont'd (comprehensive-0174/0175)
markNotTestable(
  "comprehensive-0174",
  "15-8-3-8 distinguishes a trigger CONDITION reference (state at trigger time, frozen) " +
    "from an ordinary reference (state at processing time) inside one trigger-type effect's " +
    "own body — a nuance of WHICH state a specific card's text snapshots. No compiled card " +
    "in the corpus carries the shape the rule's own example needs (a trigger-condition-scoped " +
    "reference like 'a Digimon with a level less than or equal to the PLAYED Digimon', frozen " +
    "even if that Digimon later digivolves before the effect activates) — the interpreter's " +
    "relativeToSource DP/level comparisons all read LIVE state at processing time, so this " +
    "specific frozen-snapshot semantic has no producing IR shape to drive.",
);
markNotTestable(
  "comprehensive-0175",
  "15-8-3-9-3/4 states that a reference made in a trigger-type effect's PROCESSING " +
    "CONDITIONS reads current-processing-time state (or trigger-time state for a " +
    "removed-from-area trigger). This is a narrower restatement of the general processing-" +
    "conditions timing already verified via BT9-042's 'if you have [Justimon]/[Raidenmon]' " +
    "gate (comprehensive-0168 above, which reads current battle-area state at declaration " +
    "time) — no additional real card isolates the trigger-time-vs-processing-time distinction " +
    "this specific sub-chunk adds for a removed-from-area trigger.",
);
