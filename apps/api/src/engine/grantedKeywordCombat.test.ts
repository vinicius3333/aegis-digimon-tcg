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
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
// Self-register every compiled-IR card so ST20-04's [On Play] GainKeyword and AD1-001 (a
// vanilla battler) resolve through the production interpreter + combat path (boot side-effect).
import "../cards/index.js";

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

function digimon(seat: Seat, dp: number, cardId = "AD1-001"): Permanent {
  seq += 1;
  const permanent = new Permanent();
  // A distinct id namespace so a hand-laid permanent never collides with the engine's own
  // permanent-id counter when a card (ST20-04) is played mid-test and mints a fresh `perm-N`.
  permanent.permanentId = `handperm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.enterFieldTurnCount = -1;
  return permanent;
}

interface Setup {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
  decisions: { seat: Seat; req: DecisionRequest }[];
}

/**
 * Seat both players on empty staged decks. `grantTo` answers the ST20-04 [On Play]
 * "1 of your Digimon gains ＜Security A. +1＞" chooseTargets prompt with a SPECIFIC
 * permanentId (the intended grantee) when that grantee is among the candidates, so the
 * grant lands on a DIFFERENT Digimon deterministically — the granted-to-OTHER case under
 * test. Only the grant prompt is auto-answered; nested prompts during the later security
 * check are left to the engine's own default resolution (the count is what the test reads).
 */
function setup(opts?: { grantTo?: () => string | undefined }): Setup {
  const state = new GameState();
  const events: ServerEvent[] = [];
  const decisions: Setup["decisions"] = [];
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req) => {
      decisions.push({ seat, req });
      if (req.kind === "chooseTargets") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const preferred = opts?.grantTo?.();
        // Answer ONLY the grant prompt — the one whose candidate set contains the intended
        // grantee. Leave any other chooseTargets unanswered so this hook never drives a
        // nested security-resolution decision.
        if (preferred !== undefined && candidates.includes(preferred)) {
          queueMicrotask(() =>
            engineRef?.applyIntent(seat, {
              type: "respondDecision",
              decisionId: req.decisionId,
              response: { kind: "chooseTargets", instanceIds: [preferred] },
            }),
          );
        }
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
  return { engine, state, events, decisions };
}

/** Tick the microtask queue until a predicate holds (bounded). `() => false` just flushes. */
async function settle(predicate: () => boolean, maxTicks = 200): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) {
    await Promise.resolve();
  }
}

/**
 * The loud-gap detector. A play/digivolve continuation that throws UnsupportedEffectError
 * is caught at GameEngine.ts and re-emitted as an `actionRejected` event; any such event
 * means a mechanic hit an unwired interpreter branch.
 */
function assertNoLoudGap(s: Setup): void {
  const gap = s.events.find((e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason));
  expect(gap && "reason" in gap ? gap.reason : undefined).toBeUndefined();
}

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}

/** Read the engine's continuous-effect ledger (private field; reached at the ledger boundary). */
function ledger(s: Setup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

function findPermanent(s: Setup, seat: Seat, cardId: string): Permanent {
  const permanent = (s.state.players[seat] as PlayerState).battleArea.find((p) => p.topCard?.cardId === cardId);
  expect(permanent, `permanent ${cardId} on seat ${seat}`).toBeDefined();
  return permanent as Permanent;
}

describe("A3 GainKeyword granted-to-other — a mid-game-granted keyword changes the GRANTEE's combat", () => {
  it("ST20-04 [On Play] grants ＜Security A. +1＞ to ANOTHER Digimon; that grantee removes 2 security cards", async () => {
    // The grantee is laid first so its permanentId is known before ST20-04's [On Play]
    // chooseTargets prompt; the hook then aims the grant at it (granted-to-OTHER).
    let granteeId: string | undefined;
    const s = setup({ grantTo: () => granteeId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const grantee = digimon(0, 10000, "BT1-024"); // a vanilla Digimon — NO printed Security Attack
    p0.battleArea.push(grantee);
    granteeId = grantee.permanentId;

    const source = instance("ST20-04", 0, false); // Garudamon, Red Lv.5, cost 7
    p0.hand.push(source);
    s.state.memory = 10; // afford the cost-7 hard play

    // Three face-down security cards so the post-attack strike count (=2) is observable
    // without ending the game (Tamers/Options have no battle interference for the count).
    p1.security.push(instance("BT1-009", 1, false), instance("BT1-009", 1, false), instance("BT1-009", 1, false));
    const securityBefore = p1.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // The grant lands on the OTHER Digimon (the grantee), NOT on ST20-04 itself.
    await settle(() => ledger(s).hasKeyword(grantee.permanentId, "SecurityAttack"));
    const sourcePerm = findPermanent(s, 0, "ST20-04");
    expect(ledger(s).hasKeyword(grantee.permanentId, "SecurityAttack")).toBe(true);
    expect(ledger(s).hasKeyword(sourcePerm.permanentId, "SecurityAttack")).toBe(false);

    // Drive the GRANTEE into a real player-directed attack. strike = 1 (base) + 1 (granted)
    // = 2 => exactly two security cards are checked and removed.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: grantee.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Two full checks (reveal -> [Security] resolution -> battle -> trash, each bracketed by a
    // continuous recompute) need a longer budget than the default microtask allowance.
    await settle(() => p1.security.length <= securityBefore - 2, 5000);
    expect(p1.security.length).toBe(securityBefore - 2);
    assertNoLoudGap(s);
  });

  it("the un-granted source (ST20-04) removes only 1 security card — the grant is on the GRANTEE, not the source", async () => {
    // Control: aim the grant at the grantee, but ATTACK with the source (ST20-04). The
    // source never received ＜Security A. +1＞, so its strike stays at the base 1.
    let granteeId: string | undefined;
    const s = setup({ grantTo: () => granteeId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const grantee = digimon(0, 10000, "BT1-024");
    p0.battleArea.push(grantee);
    granteeId = grantee.permanentId;

    const source = instance("ST20-04", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    p1.security.push(instance("BT1-009", 1, false), instance("BT1-009", 1, false), instance("BT1-009", 1, false));
    const securityBefore = p1.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ledger(s).hasKeyword(grantee.permanentId, "SecurityAttack"));
    const sourcePerm = findPermanent(s, 0, "ST20-04");
    sourcePerm.enterFieldTurnCount = -1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourcePerm.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // The source's strike is the base 1 (no grant on it) => exactly one card removed.
    // Wait for the closing event instead of a short fixed microtask budget: the production
    // security pipeline brackets the reveal and removal with continuous recomputations.
    await settle(() => s.events.some((event) => event.kind === "securityChecked"), 5000);
    await settle(() => false, 5000);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(p1.security.length).toBe(securityBefore - 1);
    assertNoLoudGap(s);
  });
});
