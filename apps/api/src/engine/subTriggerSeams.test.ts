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
import { setupEngine, settle } from "./testkit/harness.js";

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

function watchBattleEntry(s: ReturnType<typeof setupEngine>, sourcePermanentId: string) {
  const entries: { subjectPermanentId?: string; entryCause?: string; controllerSeat?: Seat }[] = [];
  advance(s.engine).ledgers.subTriggers.subscribe({
    event: "onEnterFieldAnyone",
    sourcePermanentId,
    once: false,
    description: "test: observe broad battle-area entry",
    run: async (ctx) => {
      const subject =
        ctx.trigger.subjectPermanentId === undefined ? undefined : ctx.game.permanentById(ctx.trigger.subjectPermanentId);
      entries.push({
        subjectPermanentId: ctx.trigger.subjectPermanentId,
        entryCause: ctx.trigger.entryCause,
        controllerSeat: subject?.controllerSeat,
      });
    },
  });
  return entries;
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

describe("OnEnterFieldAnyone broad battle-entry seam", () => {
  it("fires once with the entered subject, controller, and cause for normal and effect plays", async () => {
    const normal = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "watcher" }], hand: [{ card: "BT1-010", as: "played" }] } });
    normal.state.memory = 10;
    const normalEntries = watchBattleEntry(normal, normal.perm("watcher").permanentId);
    expect(normal.engine.applyIntent(0, { type: "playCard", instanceId: normal.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => normalEntries.length === 1);
    expect(normalEntries).toEqual([{ subjectPermanentId: normal.perm("played").permanentId, entryCause: "play", controllerSeat: 0 }]);

    const effect = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "watcher" }], trash: [{ card: "BT1-010", as: "played" }] } });
    const effectEntries = watchBattleEntry(effect, effect.perm("watcher").permanentId);
    await advance(effect.engine).verb.playInstances([effect.inst("played").instanceId], "test-effect-play");
    expect(effectEntries).toEqual([{ subjectPermanentId: effect.perm("played").permanentId, entryCause: "play", controllerSeat: 0 }]);
  });

  it("fires once for manual and effect-driven digivolution", async () => {
    const manual = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }, { card: "BT1-010", as: "watcher" }], hand: [{ card: "BT1-015", as: "into" }] },
    });
    manual.state.memory = 10;
    const manualEntries = watchBattleEntry(manual, manual.perm("watcher").permanentId);
    expect(manual.engine.applyIntent(0, { type: "digivolve", permanentId: manual.perm("base").permanentId, instanceId: manual.inst("into").instanceId })).toEqual({ ok: true });
    await settle(() => manualEntries.length === 1);
    expect(manualEntries).toEqual([{ subjectPermanentId: manual.perm("base").permanentId, entryCause: "digivolve", controllerSeat: 0 }]);

    const effect = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }, { card: "BT1-010", as: "watcher" }], hand: [{ card: "BT1-015", as: "into" }] },
    });
    const effectEntries = watchBattleEntry(effect, effect.perm("watcher").permanentId);
    await advance(effect.engine).verb.digivolveFromInstance(effect.perm("base").permanentId, effect.inst("into").instanceId, { ignoreRequirements: true });
    expect(effectEntries).toEqual([{ subjectPermanentId: effect.perm("base").permanentId, entryCause: "digivolve", controllerSeat: 0 }]);
  });

  it("covers breeding movement, leaves existing breeding watchers ordered, and excludes non-entry movement", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "watcher" }, { card: "BT1-010", as: "returned" }], breeding: { card: "BT1-011", as: "bred" } } });
    s.state.phase = Phase.Breeding;
    const entries = watchBattleEntry(s, s.perm("watcher").permanentId);
    let breedingWatcherFires = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenMovedFromBreeding",
      sourcePermanentId: s.perm("watcher").permanentId,
      once: false,
      description: "test: existing breeding watcher remains after broad entry fire",
      run: async () => {
        breedingWatcherFires += 1;
      },
    });
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("bred").permanentId })).toEqual({ ok: true });
    await settle(() => entries.length === 1 && breedingWatcherFires === 1);
    expect(entries).toEqual([{ subjectPermanentId: s.perm("bred").permanentId, entryCause: "move", controllerSeat: 0 }]);
    await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
    expect(entries).toHaveLength(1);
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

  it("Q4400 returnToHand loses the old target when a wouldBeReturned watcher DNA digivolves it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.inst("dinobeemon").instanceId]);

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076");
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-074");
  });

  it("Q2402/Q2404 count replacement-local Digi-Egg/token returns as moved without hand-return events", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const mother = permanentOf("EX2-007", 0, 15_000);
    const token = permanentOf("TOKEN-Amon-of-Crimson-Flame", 0, 3000);
    const watcher = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(mother, token, watcher);
    p0.eggDeck.push(instance("BT1-001", 0, false));

    let handAddFires = 0;
    let digimonReturnFires = 0;
    for (const event of ["whenEffectAddsToHand", "whenDigimonReturnsToHand"] as const) {
      advance(s.engine).ledgers.subTriggers.subscribe({
        event,
        sourcePermanentId: watcher.permanentId,
        once: false,
        run: async () => {
          if (event === "whenEffectAddsToHand") handAddFires += 1;
          else digimonReturnFires += 1;
        },
        description: `test: replacement-local ${event} negative`,
      });
    }

    const movedMother = await primitivesOf(s).returnToHand([mother.topCard!.instanceId]);
    const movedToken = await primitivesOf(s).returnToHand([token.topCard!.instanceId]);

    expect(movedMother).toHaveLength(1);
    expect(movedToken).toHaveLength(1);
    expect(p0.eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "EX2-007"]);
    expect(p0.eggDeck.at(-1)?.faceUp).toBe(false);
    expect(p0.hand).toHaveLength(0);
    expect(handAddFires).toBe(0);
    expect(digimonReturnFires).toBe(0);
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

/**
 * CR §15-4-4-3 location check for LOOSE-anchored watchers (KB Q2671 BT16-082, Q2805 BT17-050).
 *
 * A watcher whose only anchor is a `sourceInstanceId` resolves its firing context through
 * `findLooseInstance`, which searches EVERY zone — so it used to keep firing after its source
 * card had moved. `Primitives.subscribeSubTrigger` now records the source card's root zone at
 * install time and `GameEngine.buildSubTriggerSourceContext` compares at activation time: trash
 * residency, OR security residency AND face-up, OR hand residency.
 *
 * The shape under test is EX7-072 (Seventh Fascination): a `{Trash} [Your Turn]` clause installs
 * a `whenOneOfYoursDigivolves` watcher; an earlier simultaneous trigger returns the card to the
 * hand before the watcher's turn to activate comes up. Q5728 is why that kills it — "a {Trash}
 * effect can be triggered/activated while its card is in the trash. Such effects can't be
 * triggered or activated in areas other than the trash."
 *
 * Scope: the check covers CONTINUOUS installs only, which is exactly the zone-resident family a
 * recompute re-derives. An already-activated effect's one-shot consequence is NOT zone-checked —
 * BT6-111 / BT23-028 arm `whenSecurityBattleEnded` from a security card that has legitimately
 * reached the trash by the time it fires (Q1495), and several such bodies then play that card
 * back from the trash. Both families have cases below.
 *
 * These fire through `fireArmedSubTriggers` (no leading recompute) because the transition under
 * test is what happens to an ALREADY-ARMED watcher when the board moves under it; a recompute
 * would tear the subscription down and re-derive it, erasing the transition.
 *
 * FAILS-WHEN-REVERTED: drop the `looseSourceLeftInstallZone` guard in
 * `buildSubTriggerSourceContext` => every moved-card case fires again => RED.
 */
describe("loose-anchored SubTrigger location check (CR §15-4-4-3)", () => {
  const EVENT = "whenOneOfYoursDigivolves";

  /**
   * The watcher under test: EX7-072's shape. `continuous: true` is what makes it the
   * zone-resident family — a `{Trash}` / `[Your Turn]` clause on a permanent-less card is
   * re-derived by every continuous recompute, so the watcher it installs IS the effect's
   * pending trigger (Q5728).
   */
  function residentWatcher(s: Setup, instanceId: string): { fires: () => number } {
    let fireCount = 0;
    primitivesOf(s).subscribeSubTrigger({
      event: EVENT,
      sourceInstanceId: instanceId,
      once: false,
      continuous: true,
      run: async () => {
        fireCount += 1;
      },
      description: "test: zone-resident loose watcher",
    });
    return { fires: () => fireCount };
  }

  /**
   * An EARLIER simultaneous trigger of the same event whose body moves the board. Anchored to a
   * battle-area permanent, so it is governed by `dropPermanent` and never zone-checked itself.
   * Installed before the watcher under test, so the ordering prompt resolves it first.
   */
  function moverTrigger(s: Setup, hostPermanentId: string, body: () => Promise<void>): { fires: () => number } {
    let fireCount = 0;
    primitivesOf(s).subscribeSubTrigger({
      event: EVENT,
      sourcePermanentId: hostPermanentId,
      once: true,
      run: async () => {
        fireCount += 1;
        await body();
      },
      description: `test: earlier simultaneous trigger ${fireCount}`,
    });
    return { fires: () => fireCount };
  }

  it("EX7-072 shape: a watcher armed from the trash does NOT fire after an earlier trigger returns its card to hand", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const host = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(host);
    const card = instance("BT1-009", 0, true);
    p0.trash.push(card);

    const mover = moverTrigger(s, host.permanentId, async () => {
      await primitivesOf(s).returnToHand([card.instanceId]);
    });
    const watcher = residentWatcher(s, card.instanceId);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(mover.fires()).toBe(1); // the earlier trigger did resolve and did move the card
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(watcher.fires()).toBe(0); // Q2671: pending activation, card left the area => dead
  });

  it("blocks revival: a card that left its recorded zone stays dead after an earlier trigger returns it", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const host = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(host);
    const card = instance("BT1-009", 0, true);
    p0.trash.push(card);

    // Two earlier simultaneous triggers: the first takes the card out of the trash, the second
    // puts it back. The engine re-checks every still-pending watcher between resolutions
    // (CR §15-4-4-5), so the departure is observed and latched in between.
    moverTrigger(s, host.permanentId, async () => {
      await primitivesOf(s).returnToHand([card.instanceId]);
    });
    moverTrigger(s, host.permanentId, async () => {
      await primitivesOf(s).trash([card.instanceId]);
    });
    const watcher = residentWatcher(s, card.instanceId);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(p0.trash.some((c) => c.instanceId === card.instanceId)).toBe(true); // it did come back
    expect(watcher.fires()).toBe(0); // §15-4-4-3: the card that returned is a NEW card
  });

  it("security: a watcher armed from face-up security dies when its card is flipped face down", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance("BT1-009", 0, true); // face up: a revealed security card
    p0.security.push(card);

    const watcher = residentWatcher(s, card.instanceId);
    card.faceUp = false; // residency alone is not enough — a face-down security card shows nothing

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(watcher.fires()).toBe(0);
  });

  it("security: a watcher armed from face-up security dies when its card leaves the stack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const host = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(host);
    const card = instance("BT1-009", 0, true);
    p0.security.push(card);

    // Moved by an earlier simultaneous trigger rather than before the fire: a bare verb call
    // recomputes internally, which would drop the continuous subscription for an unrelated
    // reason and prove nothing about the zone check.
    const mover = moverTrigger(s, host.permanentId, async () => {
      await primitivesOf(s).returnToHand([card.instanceId]);
    });
    const watcher = residentWatcher(s, card.instanceId);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(mover.fires()).toBe(1);
    expect(watcher.fires()).toBe(0);
  });

  it("regression: a trash-resident watcher whose card never moves still fires", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance("BT1-009", 0, true);
    p0.trash.push(card);

    const watcher = residentWatcher(s, card.instanceId);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(watcher.fires()).toBe(1);
  });

  it("regression: a hand-resident watcher whose card never moves still fires", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance("BT1-009", 0, true);
    p0.hand.push(card);

    const watcher = residentWatcher(s, card.instanceId);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(watcher.fires()).toBe(1);
  });

  it("BT6-111 shape: an ALREADY-ACTIVATED [Security] effect's one-shot still fires from the trash", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance("BT1-009", 0, true); // revealed face up during the security check
    p0.security.push(card);

    // A [Security] effect activates during the security check and arms its end-of-battle
    // consequence. Q1495: "it activates at the end of the battle, regardless of outcome" — and
    // by then the security card has legitimately gone to the trash, which is where BT23-028 and
    // BT23-052 then play the card back from. NOT continuous: the effect has already activated,
    // so Q2671's "pending activation" check must not reach it.
    let fireCount = 0;
    primitivesOf(s).subscribeSubTrigger({
      event: EVENT,
      sourceInstanceId: card.instanceId,
      once: true,
      run: async () => {
        fireCount += 1;
      },
      description: "test: already-activated security consequence",
    });

    await primitivesOf(s).trash([card.instanceId]);
    expect(p0.trash.some((c) => c.instanceId === card.instanceId)).toBe(true);

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(fireCount).toBe(1);
  });

  it("regression: a permanent-anchored watcher is untouched by the loose-zone check", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const host = permanentOf("BT1-009", 0, 3000);
    p0.battleArea.push(host);

    let fireCount = 0;
    primitivesOf(s).subscribeSubTrigger({
      event: EVENT,
      sourcePermanentId: host.permanentId,
      sourceInstanceId: host.topCard?.instanceId,
      once: false,
      continuous: true,
      run: async () => {
        fireCount += 1;
      },
      description: "test: permanent-anchored control",
    });

    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(fireCount).toBe(1); // lifecycle stays with dropPermanent, no zone recorded
  });

  it("regression: an activationContext-frozen watcher is untouched by the loose-zone check", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const card = instance("BT1-009", 0, true);
    p0.trash.push(card);

    // KB Q2591 (BT15-095): a player-scoped watcher keeps the context it was activated with.
    // Not continuous — this shape is armed by a resolving [Main] effect, not re-derived.
    let fireCount = 0;
    primitivesOf(s).subscribeSubTrigger({
      event: EVENT,
      activationContext: { trigger: {}, fx: primitivesOf(s) } as unknown as EffectContext,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: activationContext control",
    });

    await primitivesOf(s).returnToHand([card.instanceId]);
    await advance(s.engine).fireArmedSubTriggers(EVENT);

    expect(fireCount).toBe(1); // frozen context, deliberately zone-blind
  });
});
