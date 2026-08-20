import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
  type DecisionResponse,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import type { EffectContext, Primitives } from "./effects/EffectContext.js";
// Self-register every compiled-IR card module (so real definitions resolve in the deck).
import "../cards/index.js";
import { advance } from "./testkit/advance.js";

/**
 * A3 for the three Phase-8 Wave-1 SubTrigger event seams, following the Phase-7
 * whenAddSecurity recipe (arm a synthetic watcher on a real on-field permanent; drive the
 * REAL production fire seam; assert the watcher body runs exactly once; assert the non-firing
 * control case stays silent).
 *
 *  - whenLinkTrashed: fires when a card sitting as a LINK card is genuinely trashed
 *    (KB EX10-062 Q5172 / EX10-073 Q5188 — a link-card REPLACE is NOT a trash, modeled by the
 *    control trashing a NON-link card, which routes the same verb but must not fire).
 *  - whenDigivolutionTrashed: fires when an effect trashes a digivolution card via the
 *    trashDigivolutionCards seam; a return-to-hand BOUNCE that clears digivolution cards uses
 *    returnToHand (a different path) and must NOT fire (KB P-004 Q4113).
 *  - whenOptionUsed: fires at the fireOptionUsed seam (BT19-040 token watcher; the use verb
 *    lands in 08-06, the fire-hook seam + a consume-site read are proven here — no dead store).
 *
 * FAILS-WHEN-REVERTED levers (documented per case below); each removes the fire at the
 * producing primitive and turns the "fires exactly once" assertion RED.
 */

let seq = 0;

function instance(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const card = new CardInstance();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function permanentOf(cardId: string, seat: Seat, dp: number): Permanent {
  seq += 1;
  const permanent = new Permanent();
  permanent.permanentId = `perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

interface Setup {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
  decisions: { seat: Seat; req: DecisionRequest }[];
}

/**
 * The least-impactful answer to any decision kind (mirrors DecisionManager's own
 * internal `safeDefault`, used when a real decision timer lapses unanswered).
 */
function safeDecisionResponse(req: DecisionRequest): DecisionResponse {
  switch (req.kind) {
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: [] };
    case "selectCards":
      return { kind: "selectCards", instanceIds: [] };
    case "orderTriggers":
      return { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) };
    case "chooseOption":
      return { kind: "chooseOption", optionIndex: 0 };
    case "optional":
    default:
      return { kind: "optional", accept: false };
  }
}

function setup(): Setup {
  const state = new GameState();
  const events: ServerEvent[] = [];
  const decisions: Setup["decisions"] = [];
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req) => {
      decisions.push({ seat, req });
      // Auto-decline synchronously. These A3s exercise the production SubTrigger fire
      // seams, not decision UX; using a REAL cardId (e.g. ST23-14) as a permanent also
      // arms that card's OWN Static reaction alongside a test's synthetic watcher, and
      // its "may you...?" prompt would otherwise stall on the DecisionManager's real
      // 60s timeout (well past vitest's testTimeout) since nothing else answers it.
      engineRef?.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: safeDecisionResponse(req),
      });
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return { engine, state, events, decisions };
}

function primitivesOf(s: Setup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("whenLinkTrashed SubTrigger event — a genuine link-card trash fires it once", () => {
  it("trashing a card that sits as a link card fires whenLinkTrashed exactly once", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const host = permanentOf("BT1-009", 0, 3000);
    const linkCard = instance("BT1-009", 0, true);
    host.linked.push(linkCard);
    p0.battleArea.push(host);

    let fireCount = 0;
    let observedSubject: string | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenLinkTrashed",
      sourcePermanentId: host.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
        observedSubject = ctx.trigger.subjectPermanentId;
      },
      description: "test: count whenLinkTrashed fires",
    });

    const moved = await primitivesOf(s).trash([linkCard.instanceId]);

    expect(moved.length).toBe(1);
    expect(host.linked.length).toBe(0); // the link card actually left the linked list
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenLinkTrashed", …) at the trash seam =>
    // fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
    expect(observedSubject).toBe(host.permanentId); // host carried for the "an opponent's Digimon" gate
  });

  it("trashing a NON-link card (a hand card) does NOT fire whenLinkTrashed (replace/non-trash control)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const host = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(host);
    const handCard = instance("BT1-009", 0, true);
    p0.hand.push(handCard);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenLinkTrashed",
      sourcePermanentId: host.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
      },
      description: "test: whenLinkTrashed non-fire control",
    });

    const moved = await primitivesOf(s).trash([handCard.instanceId]);

    expect(moved.length).toBe(1); // the hand card was trashed
    expect(fireCount).toBe(0); // but it was not a LINK card => no fire (KB Q5172/Q5188)
  });
});

describe("whenDigivolutionTrashed SubTrigger event — a genuine effect-trash fires it", () => {
  it("trashing a digivolution card via trashDigivolutionCards fires whenDigivolutionTrashed once", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;

    // An opponent's (seat 1) Digimon with one digivolution-stack card.
    const oppPerm = permanentOf("BT1-009", 1, 3000);
    const stackCard = instance("BT1-009", 1, false);
    oppPerm.stack.push(stackCard);
    p1.battleArea.push(oppPerm);

    // The watcher anchor is a friendly on-field permanent (seat 0).
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    (s.state.players[0] as PlayerState).battleArea.push(watcherPerm);

    let fireCount = 0;
    let observedSubject: string | undefined;
    let faceDownBatch: string[] | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenDigivolutionTrashed",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
        observedSubject = ctx.trigger.subjectPermanentId;
      },
      description: "test: count whenDigivolutionTrashed fires",
    });
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "onDigivolutionCardsDiscardedBatch",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async (ctx) => {
        faceDownBatch = ctx.trigger.trashedFaceDownDigivolutionInstanceIds;
      },
      description: "test: preserve pre-trash face-down state in the batch payload",
    });

    const moved = await primitivesOf(s).trashDigivolutionCards(oppPerm.permanentId, [stackCard.instanceId]);

    expect(moved.length).toBe(1);
    expect(oppPerm.stack.length).toBe(0);
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenDigivolutionTrashed", …) in
    // trashDigivolutionCards => fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
    expect(observedSubject).toBe(oppPerm.permanentId);
    expect(faceDownBatch).toEqual([stackCard.instanceId]);
  });

  it("a return-to-hand bounce that clears digivolution cards does NOT fire whenDigivolutionTrashed (Q4113)", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;

    const oppPerm = permanentOf("BT1-009", 1, 3000);
    const stackCard = instance("BT1-009", 1, true);
    oppPerm.stack.push(stackCard);
    p1.battleArea.push(oppPerm);

    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    (s.state.players[0] as PlayerState).battleArea.push(watcherPerm);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenDigivolutionTrashed",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: whenDigivolutionTrashed bounce-clear control",
    });

    // Bounce the permanent (its top card) — the whole stack (incl. the digivolution card) is
    // cleared to hand via returnToHand, a DIFFERENT path than trashDigivolutionCards.
    const moved = await primitivesOf(s).returnToHand([oppPerm.topCard!.instanceId]);

    expect(moved.length).toBeGreaterThan(0); // the bounce cleared the stack to hand
    expect(fireCount).toBe(0); // a bounce-clear is NOT a digivolution-trash (Q4113) => no fire
  });
});

describe("whenOptionUsed SubTrigger event — the fire-hook seam (consumed in 08-06)", () => {
  it("the fireOptionUsed seam fires an armed whenOptionUsed watcher (consume-site read, no dead store)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);
    const usedOption = instance("BT1-009", 0, true);

    let fireCount = 0;
    let observedSubject: string | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOptionUsed",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
        observedSubject = ctx.trigger.subjectPermanentId;
      },
      description: "test: count whenOptionUsed fires",
    });

    await primitivesOf(s).fireOptionUsed(usedOption.instanceId);

    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenOptionUsed", …) in fireOptionUsed =>
    // fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
    expect(observedSubject).toBe(usedOption.instanceId);
  });
});

describe("whenPlayed oncePerTiming windowToken — dedupes 2 plays from ONE resolving effect (KB Q2814 / BT2-053)", () => {
  it("two tokens played by ONE resolving effect fire an oncePerTiming whenPlayed watcher exactly once", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenPlayed",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      oncePerTiming: true,
      run: async () => {
        fireCount += 1;
      },
      description: "test: BT2-053-shape oncePerTiming whenPlayed watcher",
    });

    // One resolving effect (Keramon's [When Digivolving]-shape) plays 2 same-named tokens
    // in a row, inside ONE window — mirrors "play 2 [Diaboromon] Tokens" (KB Q2814).
    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon Token");

    // FAILS-WHEN-REVERTED: stop threading `this.activeWindowToken` into
    // `SubTriggerRegistry.fire()` from `fireSubTrigger` (drop the 4th arg, or don't open the
    // window in `withResolvingWindow`) => each nested play's `whenPlayed` fire gets no
    // shared windowToken => the oncePerTiming guard never matches => fireCount goes to 2 =>
    // RED.
    expect(fireCount).toBe(1);
  });

  it("control: two SEPARATE resolving-effect windows each fire the oncePerTiming watcher (2 total)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenPlayed",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      oncePerTiming: true,
      run: async () => {
        fireCount += 1;
      },
      description: "test: oncePerTiming control — separate windows still both fire",
    });

    // Two genuinely SEPARATE resolving-effect windows (not two plays within one) — each
    // must still trigger the watcher once, so simultaneous-play dedup never bleeds across
    // unrelated events.
    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon Token");
    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon Token");

    expect(fireCount).toBe(2);
  });
});

describe("whenEffectAddsToHand / whenEffectAddsToOpponentHand — fx.draw and returnToHand", () => {
  it("fx.draw fires whenEffectAddsToHand for the drawing seat's own watcher", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    p0.deck.push(instance("BT1-009", 0, false));
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenEffectAddsToHand",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: count whenEffectAddsToHand fires",
    });

    const drawn = await primitivesOf(s).draw(0, 1);

    expect(drawn.length).toBe(1);
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenEffectAddsToHand", …) in fx.draw =>
    // fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
  });

  it("returnToHand fires whenEffectAddsToHand for the recipient's own watcher, and whenCardReturnsFromTrashToHand when the origin was trash", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const trashedCard = instance("BT1-009", 0, true);
    p0.trash.push(trashedCard);
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let handFireCount = 0;
    let trashFireCount = 0;
    let observedCardIds: string[] | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenEffectAddsToHand",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async () => {
        handFireCount += 1;
      },
      description: "test: count whenEffectAddsToHand fires (returnToHand)",
    });
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenCardReturnsFromTrashToHand",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async (ctx) => {
        trashFireCount += 1;
        observedCardIds = ctx.trigger.returnedFromTrashCardIds;
      },
      description: "test: count whenCardReturnsFromTrashToHand fires",
    });

    const moved = await primitivesOf(s).returnToHand([trashedCard.instanceId]);

    expect(moved.length).toBe(1);
    // FAILS-WHEN-REVERTED: drop either fireSubTrigger call in returnToHand => the
    // corresponding count stays 0 => RED.
    expect(handFireCount).toBe(1);
    expect(trashFireCount).toBe(1);
    expect(observedCardIds).toEqual(["BT1-009"]);
  });

  it("returnToHand does NOT fire whenCardReturnsFromTrashToHand when the origin was NOT trash (control)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const oppPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(oppPerm);
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let trashFireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenCardReturnsFromTrashToHand",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async () => {
        trashFireCount += 1;
      },
      description: "test: whenCardReturnsFromTrashToHand non-trash-origin control",
    });

    const moved = await primitivesOf(s).returnToHand([oppPerm.topCard!.instanceId]);

    expect(moved.length).toBe(1); // the bounce moved a battle-area permanent's top card to hand
    expect(trashFireCount).toBe(0); // origin was NOT trash => no fire
  });
});

describe("whenEffectAddsToDeck — the whenEffectAddsToHand sibling for deck-bound returns", () => {
  it("returnToDeck fires whenEffectAddsToDeck for the recipient's own watcher", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const oppPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(oppPerm);
    const watcherPerm = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(watcherPerm);

    let fireCount = 0;
    let payload: EffectContext["trigger"] | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenEffectAddsToDeck",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
        payload = ctx.trigger;
      },
      description: "test: count whenEffectAddsToDeck fires",
    });

    const moved = await primitivesOf(s).returnToDeck([oppPerm.topCard!.instanceId]);

    expect(moved.length).toBe(1);
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenEffectAddsToDeck", …) in returnToDeck
    // => fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
    expect(payload).toMatchObject({ effectAddedToDeckSeat: 0, effectAddedToDeckBySeat: 0 });
  });
});

describe("whenFaceUpCardsAddedToOpponentSecurity — the effect-driven addSecurity seam", () => {
  it("addSecurity with faceUp:true fires whenFaceUpCardsAddedToOpponentSecurity for the opponent's watcher", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const cardToAdd = instance("BT1-009", 0, false);
    p0.hand.push(cardToAdd);
    // Watcher sits on the OPPONENT of seat 0 (seat 1) — "your opponent's security".
    const watcherPerm = permanentOf("BT1-009", 1, 3000);
    p1.battleArea.push(watcherPerm);

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenFaceUpCardsAddedToOpponentSecurity",
      sourcePermanentId: watcherPerm.permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: count whenFaceUpCardsAddedToOpponentSecurity fires",
    });

    await primitivesOf(s).addSecurity(0, [cardToAdd.instanceId], { faceUp: true });

    // FAILS-WHEN-REVERTED: drop the piggyback fireSubTrigger("whenFaceUpCardsAddedToOpponentSecurity",
    // …) at the addSecurity seam => fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
  });
});

describe("under-Tamer trash reaction (ST23-14) — cards placed UNDER a Tamer share the stack/trash seam", () => {
  it("placeUnder a card under a Tamer then trash it fires whenDigivolutionTrashed gated by isSelfRef on the Tamer", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    // A Tamer permanent (ST23-14) on seat 0's field. Cards placed face down under a Tamer via
    // `placeUnder` land in `permanent.stack` — the SAME collection digivolution cards use — and
    // are trashed by an effect through the SAME `trashDigivolutionCards` seam, so the existing
    // `whenDigivolutionTrashed` event already covers "effects trash cards from under this Tamer".
    const tamer = permanentOf("ST23-14", 0, 0);
    p0.battleArea.push(tamer);

    // A loose card sitting in the deck, to be placed under the Tamer.
    const underCard = instance("BT1-009", 0, false);
    p0.deck.push(underCard);
    await primitivesOf(s).placeUnder(tamer.permanentId, [underCard.instanceId]);
    expect(tamer.stack.length).toBe(1); // the card is now UNDER the Tamer

    // The reactive watcher carries ST23-14's IR gate: sourceFilter isSelfRef => the trashed-from
    // host must BE this Tamer. We assert the fire seam carries the Tamer as the subject so that
    // gate (subjectMatchesFilter isSelfRef) holds.
    let fireCount = 0;
    let observedSubject: string | undefined;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenDigivolutionTrashed",
      sourcePermanentId: tamer.permanentId,
      once: false,
      run: async (ctx) => {
        fireCount += 1;
        observedSubject = ctx.trigger.subjectPermanentId;
      },
      description: "test: ST23-14 under-Tamer trash reaction",
    });

    const moved = await primitivesOf(s).trashDigivolutionCards(tamer.permanentId, [underCard.instanceId], {
      byEffectSeat: 0,
    });

    expect(moved.length).toBe(1);
    expect(tamer.stack.length).toBe(0); // the under-card left the Tamer's stack
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenDigivolutionTrashed", …) in
    // trashDigivolutionCards => fireCount stays 0 => RED.
    expect(fireCount).toBe(1);
    expect(observedSubject).toBe(tamer.permanentId); // the Tamer is the subject => isSelfRef gate holds
  });
});
