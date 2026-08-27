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
  getCardDefinition,
  getCompiledCard,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
// Self-register every card module so the engine drives the REGISTERED BT3-056 hand-override
// (its ＜Digisorption＞ Replacement + redirector registration) rather than a hand-built ledger.
import { compiled } from "./BT3-056.js";

/**
 * A3 — BT3-056 Tyranomon: interactive ＜Digisorption -3＞ with the [Your Turn][Once Per Turn]
 * opponent-redirect.
 *
 * source (documented behavior) + printed text + KB:
 *   1. ＜Digisorption -3＞ (Comprehensive Rules §16-10): digivolving into this card from hand,
 *      you MAY suspend 1 of YOUR Digimon to reduce the digivolution cost by 3. INTERACTIVE —
 *      declining pays the full cost. (documented behavior BeforePayCost rule implementation.)
 *   2. [Your Turn][Once Per Turn] When suspending for a ＜Digisorption＞ skill, you may suspend
 *      your OPPONENT's Digimon instead (documented behavior rule implementation). Per
 *      KB Q4703 this redirect needs THIS card already on the battle area — it does NOT apply to
 *      its OWN digivolve-into. So the redirect is exercised with a SEPARATE BT3-056 already in
 *      play while digivolving into a new BT3-056.
 *
 * The cost is read off the shared memory gauge across the REAL digivolve intent. The suspend is
 * paid through the real engine (primitives.suspend, which fires the whenSuspended window).
 *
 * FAILS-WHEN-REVERTED levers (each reverts a distinct claim to RED):
 *   - Neuter the redirect (digisorptionSuspendCandidates drops the opponent branch, or BT3-056
 *     stops registering as a redirector): the opponent's Digimon can no longer be chosen → the
 *     redirect test can't suspend the opponent (it suspends own / pays full) → RED.
 *   - Remove the interactive payment (payDigisorption returns 0): the cost stops dropping on the
 *     accept path → the "pays 2 (5-3)" assertions go RED.
 */

let seq = 0;
function instance(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `bt3056-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = false;
  return c;
}

function permanent(seat: Seat, cardId: string, dp = 0): Permanent {
  seq += 1;
  const p = new Permanent();
  p.permanentId = `bt3056-perm-${seq}`;
  p.controllerSeat = seat;
  p.topCard = instance(cardId, seat);
  p.topCard.faceUp = true;
  p.isSuspended = false;
  p.inBreeding = false;
  p.baseDP = dp;
  p.currentDP = dp;
  return p;
}

interface Setup {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
}

/**
 * Build an engine whose decision responder ACCEPTS the ＜Digisorption＞ optional (or declines
 * when `acceptDigisorption` is false) and, for the suspend selection, picks the candidate top-card
 * instance id matching `chooseInstanceId` (else the first offered).
 */
function setup(opts: { acceptDigisorption: boolean; chooseInstanceId?: () => string | undefined }): Setup {
  const state = new GameState();
  const events: ServerEvent[] = [];
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat: Seat, req: DecisionRequest) => {
      if (req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: opts.acceptDigisorption },
          }),
        );
      } else if (req.kind === "chooseTargets" || req.kind === "selectCards") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const want = opts.chooseInstanceId?.();
        const pick = want !== undefined && candidates.includes(want) ? want : candidates[0];
        const ids = pick !== undefined ? [pick] : [];
        const response =
          req.kind === "selectCards"
            ? { kind: "selectCards" as const, instanceIds: ids }
            : { kind: "chooseTargets" as const, instanceIds: ids };
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response }),
        );
      } else if (req.kind === "chooseOption") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseOption", optionIndex: 0 },
          }),
        );
      }
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return { engine, state, events };
}

async function settle(predicate: () => boolean, maxTicks = 400): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

// BT3-056 printed EvoCost: Green / Lv.6 / cost 5. AD1-011 is a Lv.5 Green base (used by the
// BT2/BT3 Digisorption oracle fixtures), so digivolving into BT3-056 onto it pays a base 5.
const BASE_CARD = "AD1-011";
const BASE_DP = 8000;

describe("A3 BT3-056 — interactive ＜Digisorption -3＞ + opponent redirect", () => {
  it("matches official metadata and publishes typed redirect metadata", () => {
    expect(getCardDefinition("BT3-056")).toMatchObject({
      nameEn: "Ceresmon",
      colors: ["Green"],
      level: 6,
      effectText: expect.stringContaining("suspend your opponent's Digimon instead"),
    });
    expect(compiled).toEqual(getCompiledCard("BT3-056"));
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Static", actions: [{ kind: "Replacement", amount: 3 }] },
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [{ kind: "GrantStatic", grant: "digisorptionRedirect" }],
        },
      ],
    });
  });
  it("declining the ＜Digisorption＞ suspend pays the full digivolve cost (5)", async () => {
    const s = setup({ acceptDigisorption: false });
    const p0 = s.state.players[0] as PlayerState;
    const own = permanent(0, "ST1-02", 3000);
    p0.battleArea.push(own);
    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    // Settle until the digivolve fully completes (memory paid AFTER the ＜Digisorption＞ decision).
    await settle(() => s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056")).toBe(true);
    expect(before - s.state.memory).toBe(5); // full cost, no reduction
    expect(own.isSuspended).toBe(false); // declined => nothing suspended
  });

  it("accepting + suspending your OWN Digimon reduces the cost by 3 (5 - 3 = 2)", async () => {
    let ownInstanceId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => ownInstanceId });
    const p0 = s.state.players[0] as PlayerState;
    const own = permanent(0, "ST1-02", 3000);
    ownInstanceId = own.topCard!.instanceId;
    p0.battleArea.push(own);
    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    await settle(() => own.isSuspended && s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056")).toBe(true);
    expect(own.isSuspended).toBe(true); // paid by suspending own Digimon
    expect(before - s.state.memory).toBe(2); // 5 - 3
  });

  it("with a BT3-056 already in play, the redirect suspends the OPPONENT's Digimon instead", async () => {
    let oppInstanceId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => oppInstanceId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // A SEPARATE BT3-056 already on the controller's battle area = the redirector (KB Q4703).
    const redirector = permanent(0, "BT3-056", 12000);
    p0.battleArea.push(redirector);
    // The controller's own Digimon (must NOT be the one suspended when the opponent is chosen).
    const own = permanent(0, "ST1-02", 3000);
    p0.battleArea.push(own);
    // The opponent's Digimon — the redirect target.
    const opp = permanent(1, "ST1-03", 2000);
    oppInstanceId = opp.topCard!.instanceId;
    p1.battleArea.push(opp);

    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    await settle(() => opp.isSuspended && s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056" && p.permanentId === base.permanentId)).toBe(true);
    expect(opp.isSuspended).toBe(true); // redirect: the OPPONENT's Digimon was suspended
    expect(own.isSuspended).toBe(false); // not the controller's own
    // The suspend ran through the real seam (primitives.suspend), which fires OnTappedAnyone /
    // whenSuspended for the opponent's permanent — observable as the suspend transition above.
    expect(before - s.state.memory).toBe(2); // 5 - 3, reduction still applied via the redirect
  });
});
