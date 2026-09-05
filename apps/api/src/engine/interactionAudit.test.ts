import { describe, it, expect } from "vitest";
import { DECK_BOTTOM, EffectTiming, Zone, type PlayerState } from "@aegis/shared";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  settle,
  type EngineSetup,
} from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { MemoryGauge } from "./MemoryGauge.js";
import "../cards/index.js";

/**
 * Cross-subsystem interaction proofs.
 *
 * Every case here is an interaction between two subsystems that each already have their own
 * suite — a battle keyword meeting a deletion-prevention keyword, a per-turn use budget meeting
 * two copies of one card, an intent validator meeting an open decision. Single-subsystem suites
 * pass on all of them without ever putting the two halves in the same game, so the seam between
 * them is exactly where a regression hides.
 *
 * Each `it` names the rule it proves and cites the Comprehensive Rules clause it comes from.
 */

const VANILLA = "AD1-001"; // no keywords, no triggers — a pure DP body

function battleArea(s: EngineSetup, seat: 0 | 1): PlayerState["battleArea"] {
  return (s.state.players[seat] as PlayerState).battleArea;
}

function onBoard(s: EngineSetup, seat: 0 | 1, permanentId: string): boolean {
  return battleArea(s, seat).some((permanent) => permanent.permanentId === permanentId);
}

/**
 * ＜Barrier＞ and ＜Fragment＞ are answered outside the Decision channel or through a bare
 * `selectCards`, and both open only once the battle result is already fixed. The combat
 * controller exposes the open barrier window so a test can wait for it rather than guess a
 * tick count.
 */
function barrierWindowOpen(s: EngineSetup): boolean {
  return (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat.hasOpenBarrierDecision;
}

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
  description: string;
}

/** The [Main] abilities a permanent currently offers, as the client would see them. */
function activatableEffects(s: EngineSetup, permanent: { activatableEffectsJson?: string }): ActivatableEntry[] {
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
  return permanent.activatableEffectsJson ? (JSON.parse(permanent.activatableEffectsJson) as ActivatableEntry[]) : [];
}

/** Pump until an effect raises a Decision, for a test that deliberately installs no responder. */
async function waitForDecision(s: EngineSetup): Promise<void> {
  for (let round = 0; round < 20 && s.state.pendingDecision === undefined; round += 1) {
    await settle(() => s.state.pendingDecision !== undefined, 200);
  }
}

describe("＜Piercing＞ meets a deletion-prevention keyword (§16-7, §16-37)", () => {
  it("performs the security check when the DP tie is survived by paying ＜Fragment＞", async () => {
    // §16-7-1: a piercing attacker that attacks and deletes an opponent's Digimon in battle,
    // AND survives, performs the security check it would otherwise skip. §14-2-1-3 makes equal
    // DP delete both combatants, so the attacker only survives here because ＜Fragment (3)＞
    // (§16-37) trashed 3 of its own digivolution cards to prevent its deletion. Survival is
    // survival: the prevention does not retroactively make this "the attacker was deleted too".
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // EX8-051 Proganomon: ＜Collision＞ ＜Piercing＞ ＜Fragment (3)＞ and no triggered effects.
    const attacker = digimon(0, 7000, "EX8-051");
    for (let i = 0; i < 3; i += 1) attacker.stack.push(instance(VANILLA, 0, true));
    p0.battleArea.push(attacker);

    const defender = digimon(1, 7000, VANILLA); // equal DP -> both would be deleted
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    p1.security.push(instance(VANILLA, 1, false));
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    expect(onBoard(s, 1, defender.permanentId)).toBe(false); // deleted by the tie
    expect(onBoard(s, 0, attacker.permanentId)).toBe(true); // ＜Fragment＞ paid, so it survived
    expect(attacker.stack.length).toBe(0); // the 3 digivolution cards were the cost
    expect(p1.security.length).toBe(0); // ＜Piercing＞ still ran the defending player's check
  });

  it("skips the security check when the attacker is deleted by the same tie", async () => {
    // The discriminator for the case above: without a prevention to pay, an equal-DP attacker
    // does not survive, so §16-7-1's "and survives" clause fails and no check happens.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 7000, "EX8-051"); // ＜Fragment (3)＞ with an EMPTY stack: unpayable
    p0.battleArea.push(attacker);
    const defender = digimon(1, 7000, VANILLA);
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    p1.security.push(instance(VANILLA, 1, false));
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    expect(onBoard(s, 1, defender.permanentId)).toBe(false);
    expect(onBoard(s, 0, attacker.permanentId)).toBe(false);
    expect(p1.security.length).toBe(1); // no survivor, no piercing check
  });
});

describe("＜Retaliation＞ meets a deletion-prevention keyword (§16-13, §16-25)", () => {
  it("triggers when the battle opponent's ＜Barrier＞ leaves the holder as the only deletion", async () => {
    // §16-13-2: ＜Retaliation＞ triggers "when just the Digimon with this effect is deleted in
    // battle". ＜Barrier＞ (§16-25-2) is an immediate-type effect that prevents its holder's
    // battle deletion, so on an equal-DP tie where the battle opponent pays ＜Barrier＞, the
    // Retaliation holder ends up as the only Digimon actually deleted in battle — which is
    // precisely the trigger condition. The trigger must therefore read the deletions that
    // really happened, not the pre-prevention battle result.
    const s = setup({ autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // BT13-041 Chirinmon: printed ＜Barrier＞ and nothing else.
    const attacker = digimon(0, 7000, "BT13-041");
    p0.battleArea.push(attacker);
    p0.security.push(instance(VANILLA, 0, false)); // the ＜Barrier＞ cost

    // BT10-078 GulusGammamon gains ＜Retaliation＞ from its own Aura while a [Gammamon]
    // digivolution card (BT21-010) is stacked — a real grant, not a synthetic keyword.
    const retaliator = digimon(1, 7000, "BT10-078");
    retaliator.stack.push(instance("BT21-010", 1, true));
    retaliator.isSuspended = true;
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => barrierWindowOpen(s), 2000);
    expect(barrierWindowOpen(s)).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: attacker.permanentId, accept: true } as never),
    ).toEqual({ ok: true });
    await settle(() => !onBoard(s, 0, attacker.permanentId));

    expect(p0.security.length).toBe(0); // ＜Barrier＞ was paid
    expect(onBoard(s, 1, retaliator.permanentId)).toBe(false); // the holder is the sole battle deletion
    // §16-13-1/§16-13-3: the holder's deletion mandatorily deletes the Digimon it battled.
    expect(onBoard(s, 0, attacker.permanentId)).toBe(false);
  });

  it("does not trigger when the tie deletes both combatants and no prevention is paid", async () => {
    // The discriminator: with both combatants genuinely deleted in battle, §16-13-2's "just"
    // is not satisfied and ＜Retaliation＞ adds nothing.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 7000, VANILLA);
    p0.battleArea.push(attacker);
    const retaliator = digimon(1, 7000, "BT10-078");
    retaliator.stack.push(instance("BT21-010", 1, true));
    retaliator.isSuspended = true;
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    expect(onBoard(s, 1, retaliator.permanentId)).toBe(false);
    expect(onBoard(s, 0, attacker.permanentId)).toBe(false); // deleted by the tie, not by the keyword
  });
});

describe("per-turn use budgets across two copies of one card (§15-6-2)", () => {
  it("gives each copy its own [Once Per Turn] budget", async () => {
    // "[Once Per Turn]" limits the effect on THAT CARD, not the effect text. Two copies of the
    // same card are two cards, so each carries its own budget. A budget keyed by card id instead
    // of by card instance would let the first copy's use silently consume the second's.
    const s = setup({
      0: {
        deck: [VANILLA, VANILLA, VANILLA, VANILLA],
        // BT23-020 Seadramon: [All Turns][Once Per Turn] When this Digimon suspends, ＜Draw 1＞.
        battleArea: [
          { card: "BT23-020", as: "first" },
          { card: "BT23-020", as: "second" },
        ],
      },
    });
    await s.ready();
    const handBefore = (s.state.players[0] as PlayerState).hand.length;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await settle(() => false, 2000);

    expect((s.state.players[0] as PlayerState).hand.length).toBe(handBefore + 2);
  });

  it("still spends each copy's budget only once per turn", async () => {
    // The discriminator: re-suspending the SAME copy in the same turn does not draw again, so the
    // two draws above are two budgets rather than one budget being ignored.
    const s = setup({
      0: { deck: [VANILLA, VANILLA, VANILLA, VANILLA], battleArea: [{ card: "BT23-020", as: "only" }] },
    });
    await s.ready();
    const handBefore = (s.state.players[0] as PlayerState).hand.length;

    await advance(s.engine).verb.suspend([s.perm("only").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("only").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("only").permanentId]);
    await settle(() => false, 2000);

    expect((s.state.players[0] as PlayerState).hand.length).toBe(handBefore + 1);
  });
});

describe("a suspension caused by the opponent (§4-6)", () => {
  it("fires the suspended Digimon's own 'when this Digimon suspends' trigger", async () => {
    // §4-6 defines suspending as a state change on the card; nothing in it makes the trigger
    // conditional on WHO caused it. A "when this Digimon suspends" watcher must therefore fire
    // for an opponent-driven suspension (an effect that suspends it, a forced attack, a block)
    // exactly as it does when its own controller suspends it to attack.
    const s = setup({
      1: { deck: [VANILLA, VANILLA, VANILLA, VANILLA], battleArea: [{ card: "BT23-020", as: "victim" }] },
    });
    await s.ready();
    const handBefore = (s.state.players[1] as PlayerState).hand.length;

    // byEffectSeat 0: seat 0's effect is what suspends seat 1's Digimon.
    await advance(s.engine).verb.suspend([s.perm("victim").permanentId], 0);
    await settle(() => false, 2000);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect((s.state.players[1] as PlayerState).hand.length).toBe(handBefore + 1);
  });
});

describe("a battle area larger than the usual board (§3-4)", () => {
  it("resolves an attack normally with 20 permanents per player", async () => {
    // §3-4 puts no cap on the battle area. Any fixed board-size assumption — a display limit
    // leaking into the rules layer, a fixed-width slot index — would surface here as a rejected
    // intent or a battle that never resolves.
    const s = setup({
      0: { battleArea: Array.from({ length: 20 }, (_, n) => ({ card: VANILLA, as: `p${n}` })) },
      1: { battleArea: Array.from({ length: 20 }, () => ({ card: VANILLA, suspended: true })), security: 1 },
    });
    await s.ready();
    const attacker = s.perm("p0");
    const defender = battleArea(s, 1)[19]!;
    attacker.currentDP = 9000;
    defender.currentDP = 3000;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    expect(onBoard(s, 1, defender.permanentId)).toBe(false);
    expect(battleArea(s, 1).length).toBe(19);
    expect(battleArea(s, 0).length).toBe(20);
  });
});

describe("an open decision blocks every other action (§15-4)", () => {
  /**
   * Lay a board where an effect is mid-resolution and waiting on a selection, with a Digimon and
   * a hand card ready so every action under test is otherwise legal — the only reason to reject
   * it is the open decision.
   */
  async function withOpenDecision(): Promise<EngineSetup> {
    const s = setup({
      0: {
        // EX3-029 Airdramon: [On Play] search the security stack and add 1 card to hand. Its
        // selection is a real Decision, and no auto-responder is installed here.
        battleArea: [
          { card: "EX3-029", as: "airdramon" },
          { card: VANILLA, as: "attacker" },
        ],
        hand: [{ card: VANILLA, as: "handCard" }],
        security: [VANILLA, VANILLA],
      },
      1: { battleArea: [VANILLA], security: [VANILLA, VANILLA] },
    });
    await s.ready();
    void advance(s.engine).fire(EffectTiming.OnPlay, s.perm("airdramon"));
    await waitForDecision(s);
    expect(s.state.pendingDecision).toBeDefined();
    return s;
  }

  it("rejects ending the phase", async () => {
    // While an effect is mid-resolution the game is not back at the player's action window, so
    // no other action may start. Letting one through would interleave a second action with the
    // suspended resolution of the first.
    const s = await withOpenDecision();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("rejects playing a card", async () => {
    const s = await withOpenDecision();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handCard").instanceId })).toEqual({
      ok: false,
      reason: "decision-pending",
    });
  });

  it("rejects digivolving", async () => {
    const s = await withOpenDecision();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("handCard").instanceId,
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("rejects declaring an attack", async () => {
    // Attacking is a main-phase action like any other, and it is the most damaging one to let
    // through: it opens a combat window — with its own block, counter and battle steps — on top
    // of an effect resolution that is still suspended waiting for an answer.
    const s = await withOpenDecision();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });
});

describe("shuffling the security stack (§4-13)", () => {
  it("returns every face-up security card to face-down", async () => {
    // A security card turned face-up by an effect is only face-up for as long as that effect
    // needs it. Shuffling the stack destroys the ordering knowledge the reveal created, so any
    // card still in the stack goes back to face-down — otherwise the shuffle leaks the card's
    // identity for the rest of the game.
    const s = setup(
      {
        0: {
          battleArea: [{ card: "EX3-029", as: "airdramon" }],
          security: [{ card: VANILLA, faceUp: true }, { card: VANILLA, faceUp: true }, VANILLA],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect((s.state.players[0] as PlayerState).security.filter((c) => c.faceUp).length).toBe(2);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("airdramon"));
    await settle(() => false, 3000);

    const security = (s.state.players[0] as PlayerState).security;
    expect(security.length).toBeGreaterThan(0);
    expect(security.every((card) => card.faceUp === false)).toBe(true);
  });
});

describe("a rejected DigiXros declaration (§7-2)", () => {
  it("leaves the hand, battle area and memory exactly as they were", async () => {
    // DigiXros validation is atomic: the server checks the whole declaration — recipe, material
    // ownership and cost — before it moves anything. A validator that consumed materials while
    // walking the recipe and only then failed would leave the player short of both the card and
    // its materials.
    const s = setup({
      0: {
        // BT10-009 Shoutmon X4 — DigiXros -2: [Shoutmon] + [Ballistamon] + [Dorulumon] + [Starmons]
        hand: [
          { card: "BT10-009", as: "x4" },
          { card: VANILLA, as: "wrongMaterial" },
        ],
        battleArea: [VANILLA],
      },
    });
    await s.ready();
    const memoryBefore = s.state.memory;
    const handBefore = (s.state.players[0] as PlayerState).hand.map((c) => c.instanceId);
    const boardBefore = battleArea(s, 0).length;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("x4").instanceId,
      digiXros: { materialInstanceIds: [s.inst("wrongMaterial").instanceId] }, // does not satisfy any slot
    });

    expect(result.ok).toBe(false);
    expect((s.state.players[0] as PlayerState).hand.map((c) => c.instanceId)).toEqual(handBefore);
    expect(battleArea(s, 0).length).toBe(boardBefore);
    expect(s.state.memory).toBe(memoryBefore);
  });
});

describe("Burst Digivolve is its own digivolution requirement (§8-3-3-2)", () => {
  it("digivolves for free off the named base while returning the named Tamer", async () => {
    // A Burst Digivolve line is a distinct digivolution requirement — a named base, a memory cost
    // of 0, and a non-memory cost of returning a specific Tamer to hand. It is not the card's
    // printed evolution condition with the cost waived.
    const s = setup({
      0: {
        hand: [{ card: "BT13-020", as: "burst" }], // Burst Digivolve: 0 from [ShineGreymon] by returning 1 [Marcus Damon]
        battleArea: [
          { card: "ST7-10", as: "base" }, // ShineGreymon
          { card: "BT12-092", as: "marcus" }, // Marcus Damon
        ],
      },
    });
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 3000);

    expect(s.perm("base").topCard?.cardId).toBe("BT13-020");
    expect(s.state.memory).toBe(memoryBefore); // cost 0 — the Tamer return IS the cost
    expect(battleArea(s, 0).some((p) => p.topCard?.cardId === "BT12-092")).toBe(false);
    expect((s.state.players[0] as PlayerState).hand.some((c) => c.cardId === "BT12-092")).toBe(true);
  });

  it("rejects the same play when the named Tamer is not in the battle area", async () => {
    // The discriminator: with the Tamer-return cost unpayable the requirement is not met, so the
    // play is illegal — it does not silently fall back to the printed evolution condition.
    const s = setup({
      0: { hand: [{ card: "BT13-020", as: "burst" }], battleArea: [{ card: "ST7-10", as: "base" }] },
    });
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("burst").instanceId,
      useAlternateCost: true,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("ST7-10");
  });
});

describe("a Tamer as the digivolution base (§8-3)", () => {
  it("digivolves a hand card onto the named Tamer that its effect treats as a Digimon", async () => {
    // Some cards let a Tamer stand in as the digivolution base ("as if the Tamer is a level 3 red
    // Digimon"). The engine must recognise that path at the digivolve verb — a base-kind check
    // that only ever accepts a Digimon would make every card in this family unplayable.
    const s = setup({
      0: {
        // BT12-012 Agunimon: may digivolve from hand onto one of your [Takuya Kanbara] cards.
        hand: [{ card: "BT12-012", as: "agunimon" }],
        battleArea: [{ card: "BT12-088", as: "takuya" }], // Takuya Kanbara, a red Tamer
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 3000);

    expect(s.perm("takuya").topCard?.cardId).toBe("BT12-012");
    expect(s.perm("takuya").stack.some((card) => card.cardId === "BT12-088")).toBe(true);
  });

  it("rejects a Tamer base for a card with no such effect", async () => {
    // The discriminator: a Tamer is not a digivolution base in general (§8-3-1 needs a Digimon),
    // only for the cards whose own text grants it.
    const s = setup({
      0: { hand: [{ card: VANILLA, as: "plain" }], battleArea: [{ card: "BT12-088", as: "takuya" }] },
    });
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("takuya").permanentId,
      instanceId: s.inst("plain").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("takuya").topCard?.cardId).toBe("BT12-088");
  });
});

describe("＜Blast DNA Digivolve＞ names its materials (§16-31-1)", () => {
  it("rejects a DNA digivolution into it from materials the keyword does not name", async () => {
    // The keyword spells out which two Digimon may become the result — "([WarGreymon] +
    // [MetalGarurumon])". Waiving the memory cost does not waive the materials: any pair of
    // Digimon must not be able to reach the card just because the cost step was skipped.
    const s = setup({
      0: {
        hand: [{ card: "BT17-078", as: "omnimon" }], // ＜Blast DNA Digivolve ([WarGreymon] + [MetalGarurumon])＞
        battleArea: [
          { card: VANILLA, as: "wrongA" }, // Greymon — not [WarGreymon]
          { card: VANILLA, as: "wrongB" }, // Greymon — not [MetalGarurumon]
        ],
      },
    });
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("wrongA").permanentId, s.perm("wrongB").permanentId],
      instanceId: s.inst("omnimon").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(battleArea(s, 0).some((p) => p.topCard?.cardId === "BT17-078")).toBe(false);
  });

  it("accepts the pair the keyword does name", async () => {
    // The discriminator: with the named materials the same play is legal and costs no memory.
    const s = setup({
      0: {
        hand: [{ card: "BT17-078", as: "omnimon" }],
        battleArea: [
          { card: "BT1-025", as: "warGreymon" }, // WarGreymon
          { card: "BT1-044", as: "metalGarurumon" }, // MetalGarurumon
        ],
      },
    });
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("warGreymon").permanentId, s.perm("metalGarurumon").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 3000);

    expect(battleArea(s, 0).some((p) => p.topCard?.cardId === "BT17-078")).toBe(true);
    expect(s.state.memory).toBe(memoryBefore);
  });
});

describe("the deck is an ordered zone (§3-2-3)", () => {
  it("keeps the existing order and appends returned cards in the order they were returned", async () => {
    // §3-2-3: "Players can't change the order of cards in their decks." Nothing in the game
    // shuffles a deck after setup — every printed "shuffle" in the card pool is a security-stack
    // shuffle — so a card sent to the bottom lands under the whole deck and the cards already
    // there keep their relative order. A stray re-sort or shuffle shows up as a changed prefix.
    const s = setup({
      0: {
        deck: [
          { card: "AD1-001", as: "d0" },
          { card: "BT1-025", as: "d1" },
          { card: "BT1-044", as: "d2" },
        ],
        hand: [
          { card: "ST7-10", as: "h0" },
          { card: "BT12-088", as: "h1" },
        ],
      },
    });
    await s.ready();
    const deckBefore = (s.state.players[0] as PlayerState).deck.map((c) => c.instanceId);

    await advance(s.engine).verb.returnToDeck([s.inst("h0").instanceId, s.inst("h1").instanceId]);
    await settle(() => false, 2000);

    const deckAfter = (s.state.players[0] as PlayerState).deck.map((c) => c.instanceId);
    expect(deckAfter).toEqual([...deckBefore, s.inst("h0").instanceId, s.inst("h1").instanceId]);
  });

  it("names the deck bottom on the movement, so the log can tell it from a top return", async () => {
    // The two returns land in the same zone but at opposite ends, and only the destination
    // label distinguishes them for the client's panel and log.
    const s = setup({
      0: { deck: [{ card: "AD1-001", as: "d0" }, "BT1-025"], hand: [{ card: "ST7-10", as: "h0" }] },
    });
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("h0").instanceId]);
    await settle(() => false, 2000);

    const moved = s.events.filter((e) => e.kind === "cardsMoved").at(-1);
    expect(moved).toMatchObject({ to: DECK_BOTTOM });
  });

  it("still names the plain deck for a top return", async () => {
    const s = setup({
      0: { deck: [{ card: "AD1-001", as: "d0" }, "BT1-025"], hand: [{ card: "ST7-10", as: "h0" }] },
    });
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("h0").instanceId], { toTop: true });
    await settle(() => false, 2000);

    const moved = s.events.filter((e) => e.kind === "cardsMoved").at(-1);
    expect(moved).toMatchObject({ to: Zone.Deck });
  });

  it("puts a card returned to the top above the existing deck", async () => {
    const s = setup({
      0: { deck: [{ card: "AD1-001", as: "d0" }, "BT1-025"], hand: [{ card: "ST7-10", as: "h0" }] },
    });
    await s.ready();
    const deckBefore = (s.state.players[0] as PlayerState).deck.map((c) => c.instanceId);

    await advance(s.engine).verb.returnToDeck([s.inst("h0").instanceId], { toTop: true });
    await settle(() => false, 2000);

    const deckAfter = (s.state.players[0] as PlayerState).deck.map((c) => c.instanceId);
    expect(deckAfter).toEqual([s.inst("h0").instanceId, ...deckBefore]);
  });
});

describe("scaling 'for each color in this Digimon's digivolution cards'", () => {
  it("counts DISTINCT colors, not the number of digivolution cards", async () => {
    // A per-color scale counts how many different colors appear across the stack. Counting cards
    // instead, or double-counting a color that two cards share, silently multiplies the effect —
    // the kind of arithmetic slip that only shows up when the stack is deeper than it is wide.
    const s = setup({
      0: {
        battleArea: [
          {
            // BT19-014 Shoutmon EX6: [On Play] for each color in this Digimon's digivolution
            // cards, all of your opponent's Digimon get -1000 DP for the turn.
            card: "BT19-014",
            as: "shoutmon",
            // 5 cards, 3 distinct colors: Red, Red, Blue, Blue, Yellow.
            under: ["BT1-009", "BT1-012", "BT1-027", "BT1-028", "BT1-045"],
          },
        ],
      },
      1: { battleArea: [{ card: VANILLA, as: "victim" }] },
    });
    await s.ready();
    const dpBefore = s.perm("victim").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoutmon"));
    await settle(() => false, 3000);

    expect(s.perm("victim").currentDP).toBe(dpBefore - 3000);
  });
});

describe("a restriction worded against the opponent (§15-11)", () => {
  it("does not also restrict the player whose effect created it", async () => {
    // "Your opponent can't play ..." names one player. A restriction stored without its owning
    // seat, or matched against every seat, quietly locks the controller out of their own turn —
    // and the symptom appears one action later, far from the card that caused it.
    const s = setup({
      0: {
        // EX3-012 Volcanicdramon: [On Play] delete all of your opponent's Digimon with the lowest
        // DP. If nothing was deleted, your opponent can't play Digimon with 5000 DP or less until
        // the end of their turn. The opponent has no Digimon, so the restriction is what applies.
        battleArea: [{ card: "EX3-012", as: "volcanic" }],
        hand: [{ card: "BT1-009", as: "smallDigimon" }], // a level 3, well under 5000 DP
      },
    });
    await s.ready();
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("volcanic"));
    await settle(() => false, 3000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smallDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 2000);
    expect(battleArea(s, 0).some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });
});

describe("a granted 'when this Digimon suspends' watcher (§15-8-3)", () => {
  it("fires exactly once per suspension", async () => {
    // A card that hands an opponent's Digimon a trigger-type effect has to do two things: record
    // the grant, and arm the watcher that makes it happen. Recording it alone leaves an aura that
    // reads as active on the board and never fires; arming it without scoping the watcher to its
    // own permanent makes one suspension charge every granted copy. This pins the middle: one
    // suspension, one charge.
    const s = setup(
      {
        0: {
          // BT14-044 Palmon: [Start of Your Main Phase] 1 of your opponent's Digimon gains
          // "[All Turns] When this Digimon becomes suspended, lose 2 memory." until their turn ends.
          battleArea: [{ card: "BT14-044", as: "palmon" }],
        },
        1: { battleArea: [{ card: VANILLA, as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));
    await settle(() => false, 3000);
    const memoryBefore = new MemoryGauge(s.state).memoryFor(1);

    await advance(s.engine).verb.suspend([s.perm("target").permanentId], 0);
    await settle(() => false, 3000);

    expect(new MemoryGauge(s.state).memoryFor(1)).toBe(memoryBefore - 2);
  });
});

describe('an optional processing condition — "by X, Y" (§15-7-5)', () => {
  it("is still offered when nothing would come of the processing after the condition", async () => {
    // §15-7-5, verbatim: "A player can choose to execute the content of optional processing
    // conditions, regardless of whether or not the content after the conditions can be executed",
    // with the example of trashing your top security card for a -5000 DP effect while the opponent
    // has no Digimon at all. The cost is the player's to pay; an empty payload is not a reason to
    // withhold the whole ability — paying a cost to move a card to the trash, or to suspend
    // something, is regularly the point of activating it.
    const s = setup({
      // BT15-009: [Main] [Once Per Turn] By paying 2 cost, delete 1 of your opponent's Digimon
      // with DP less than or equal to this Digimon's DP. The opponent's board is empty, so the
      // deletion half has nothing to do — the cost is still the player's to pay.
      0: { battleArea: [{ card: "BT15-009", as: "source" }] },
      1: {},
    });
    await s.ready();
    s.state.memory = 5;

    const entry = activatableEffects(s, s.perm("source")).find(
      (e) => e.instanceId === s.perm("source").topCard?.instanceId,
    );
    expect(entry, "the [Main] ability is offered even with nothing to delete").toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: entry!.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectActivated"), 3000);

    expect(s.state.memory).toBe(3); // the cost was paid; the payload simply found nothing
  });
});

describe("deletion by an effect is not deletion in battle (§4-14)", () => {
  it("does not trigger ＜Retaliation＞ when the holder is deleted by an effect", async () => {
    // KB BT4-101/LM-003: a Digimon removed by an effect was not "deleted in battle", so the
    // battle-scoped reactions stay silent. This is the boundary the combat pipeline has to keep:
    // ＜Retaliation＞ (§16-13-1) reads the battle result, not "this Digimon died somehow".
    const s = setup(
      {
        0: { battleArea: [{ card: VANILLA, as: "bystander" }] },
        1: { battleArea: [{ card: "BT10-078", as: "retaliator", under: ["BT21-010"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("retaliator"), "Retaliation")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("retaliator").permanentId]);
    await settle(() => false, 3000);

    expect(battleArea(s, 1).length).toBe(0);
    expect(battleArea(s, 0).length).toBe(1); // no battle happened, so nothing retaliates
  });

  it("does not run a ＜Piercing＞ security check when the Digimon is removed by an effect", async () => {
    // §16-7-1 scopes ＜Piercing＞ to "when this Digimon ATTACKS and deletes an opponent's Digimon
    // in battle". A piercing Digimon that removes an opponent by effect has neither attacked nor
    // battled, so the defending player's security stack is untouched.
    const s = setup({
      0: { battleArea: [{ card: "EX8-051", as: "piercer" }] },
      1: { battleArea: [{ card: VANILLA, as: "victim" }], security: [VANILLA, VANILLA] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle(() => false, 3000);

    expect(battleArea(s, 1).length).toBe(0);
    expect((s.state.players[1] as PlayerState).security.length).toBe(2);
  });
});

describe("an effect coming from a digivolution card (§4-5)", () => {
  it("stops applying the moment that card leaves the digivolution stack", async () => {
    // A card under a Digimon confers its effect only while it is there (KB BT4-006: "You lose
    // this card's inherited effect when it is placed in the trash"). BT10-078 gains
    // ＜Retaliation＞ from its own Aura only "while a [Gammamon] card is in its digivolution
    // cards", so trashing that card has to take the keyword with it — a grant that outlives its
    // source is a keyword the board still shows and the rules no longer support.
    const s = setup({
      1: { battleArea: [{ card: "BT10-078", as: "holder", under: [{ card: "BT21-010", as: "gammamon" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("holder"), "Retaliation")).toBe(true);

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("holder").permanentId, [s.inst("gammamon").instanceId]);
    await settle(() => false, 3000);

    expect(s.perm("holder").stack.length).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("holder"), "Retaliation")).toBe(false);
  });
});

describe("scaling counts only what the effect says it counts", () => {
  it("ignores the Digimon's own colors when counting colors in its digivolution cards", async () => {
    // "For each color in this Digimon's digivolution cards" names one zone. Folding the top
    // card's own colors into the count inflates every such effect by up to three — and it is
    // invisible on a mono-colour board, which is where these effects are usually tested.
    // BT19-014 is Red/Yellow/Black; a stack of two Blue cards is exactly 1 color.
    const s = setup({
      0: { battleArea: [{ card: "BT19-014", as: "shoutmon", under: ["BT1-027", "BT1-028"] }] },
      1: { battleArea: [{ card: VANILLA, as: "victim" }] },
    });
    await s.ready();
    const dpBefore = s.perm("victim").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoutmon"));
    await settle(() => false, 3000);

    expect(s.perm("victim").currentDP).toBe(dpBefore - 1000);
  });
});

describe("a conditional restriction (§15-11)", () => {
  it("is not created at all when the condition that gates it is false", async () => {
    // EX3-012 Volcanicdramon only restricts the opponent "if no Digimon is deleted by this
    // effect". With an opponent Digimon on the board the deletion happens, so the restriction
    // half never applies — the discriminator for the "restricts only the opponent" case above,
    // and the shape that goes wrong when a conditional clause is stored unconditionally.
    const s = setup(
      {
        0: {
          battleArea: [{ card: "EX3-012", as: "volcanic" }],
          hand: [{ card: "BT1-009", as: "smallDigimon" }],
        },
        1: { battleArea: [{ card: VANILLA, as: "prey" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("volcanic"));
    await settle(() => false, 3000);
    expect(battleArea(s, 1).length).toBe(0); // the deletion half happened

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smallDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 2000);
    expect(battleArea(s, 0).some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });
});

describe("one trigger condition triggers once (§15-5-2)", () => {
  it("fires a 'when a card is removed from your security stack' watcher once for a 2-card removal", async () => {
    // §15-5-2 uses this exact example: an effect reading "[Opponent's Turn] When a card is removed
    // from your security stack, ..." triggers ONCE even when 2 or more cards leave the stack at the
    // same time. A watcher driven per removed card instead of per removal event multiplies the
    // effect by however many cards happened to move.
    const s = setup(
      {
        // BT11-045 ClavisAngemon: [Opponent's Turn] When a card is removed from your security
        // stack, 1 of your opponent's Digimon gets -4000 DP for the turn.
        0: { battleArea: [{ card: "BT11-045", as: "clavis" }], security: [VANILLA, VANILLA, VANILLA] },
        1: { battleArea: [{ card: VANILLA, as: "victim" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1; // [Opponent's Turn] — seat 0's watcher is live during seat 1's turn
    const dpBefore = s.perm("victim").currentDP;

    await advance(s.engine).verb.trashFromSecurity(0, 2, { fromTop: true });
    await settle(() => false, 3000);

    expect((s.state.players[0] as PlayerState).security.length).toBe(1);
    expect(s.perm("victim").currentDP).toBe(dpBefore - 4000);
  });
});
