import { describe, it, expect, vi } from "vitest";
import {
  GameState,
  PlayerState,
  CardInstance,
  requireCardDefinition,
  DECISION_KINDS,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
} from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { GameEngine, type GameEngineHooks } from "../GameEngine.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 18 "Other Information" (comprehensive-0018, 0266-0272):
 * pending processing (18-1), overwrite processing (18-2), and infinite loops (18-3).
 *
 * comprehensive-0018 (TOC dot-leader) and comprehensive-0266 (bare chapter heading) carry
 * no normative content and are seeded in `not-testable.ts` (imported above). Chunks 0271
 * and 0272 are the document's Update History (version-by-version changelog) — legitimately
 * non-normative, marked not-testable inline below (they aren't in the shared manifest
 * because chapter 18's revision-history entries are specific to this file's scope).
 */

let seq = 0;
function card(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `ch18-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = faceUp;
  return c;
}

interface Harness {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
}

/**
 * Full-turn-loop harness (same shape as `cards/EX10/EX10-058.test.ts`'s fullTurnHarness):
 * seats both players on small staged decks so the real Draw/Main/End phases run, with every
 * decision auto-resolved. Needed because §18-1's "processed similar to a triggered effect at
 * end of turn" claim is only observable through the real OnEndTurn window, which the
 * hand-laid intent harness (`setupEngine`) never opens.
 */
function fullTurnHarness(firstSeat: Seat = 0): Harness {
  const state = new GameState();
  const events: ServerEvent[] = [];
  let engineRef: GameEngine | undefined;
  const respond = (seat: Seat, req: DecisionRequest, response: unknown): void => {
    queueMicrotask(() =>
      engineRef?.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: response as never,
      }),
    );
  };
  const hooks: GameEngineHooks = {
    seed: firstSeat === 0 ? 0 : 1,
    requestDecision: (seat, req) => {
      if (req.kind === "optional") respond(seat, req, { kind: "optional", accept: true });
      else if (req.kind === "selectCards")
        respond(seat, req, {
          kind: "selectCards",
          instanceIds: (req.options?.candidateInstanceIds ?? []).slice(0, req.options?.max ?? 99),
        });
      else if (req.kind === "chooseTargets")
        respond(seat, req, {
          kind: "chooseTargets",
          instanceIds: (req.options?.candidateInstanceIds ?? []).slice(0, req.options?.max ?? 99),
        });
      else if (req.kind === "orderTriggers")
        respond(seat, req, { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) });
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  for (const seat of [0, 1] as const) {
    const player = state.players[seat] as PlayerState;
    for (let i = 0; i < 5; i += 1) player.deck.push(card("BT1-009", seat, false));
  }
  state.turnSeat = firstSeat;
  state.isFirstPlayersFirstTurn = true;
  return { engine, state, events };
}

async function driveTurn(h: Harness, seat: Seat, duringMain?: () => void | Promise<void>): Promise<void> {
  const turn = h.engine.runOneTurn();
  const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  expect(mainPhase.isOpen, "Main phase opened by the real loop").toBe(true);
  if (duringMain) await duringMain();
  expect(h.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("§18-1 Pending Processing (comprehensive-0267)", () => {
  it(
    "BT1-090 ('[Main] Gain 2 memory. At end of turn, lose 2 memory.') is the rule's OWN worked example: " +
      "the 'lose memory' half is processed at the predetermined end-of-turn timing, similar to a triggered effect",
    async () => {
      cite(
        "comprehensive-0267",
        "18-1-1: pending processing is processed at the predetermined timing, similar to a " +
          "triggered effect — the rule's own example is exactly '[When Attacking] Gain 3 memory. " +
          "Lose 3 memory at the end of the turn'; BT1-090 is a real card carrying the same shape " +
          "on a [Main] Option instead ('Gain 2 memory. At end of turn, lose 2 memory.')",
      );
      const def = requireCardDefinition("BT1-090");
      expect(def.effectText).toContain("Gain 2 memory");
      expect(def.effectText).toContain("lose 2 memory");

      const h = fullTurnHarness(0);
      const p0 = h.state.players[0] as PlayerState;
      p0.battleArea.push(digimon(0, 3000, "BT1-009")); // §4-21 color-requirement source (Red)
      const option = card("BT1-090", 0, true);
      p0.hand.push(option);

      // Wrap the real fireSubTrigger seam (same technique as turnEndHarness.test.ts) purely to
      // observe state.memory immediately around the "endOfTurn" watcher window — not to stub it.
      const original = (
        GameEngine.prototype as unknown as {
          fireSubTrigger(this: GameEngine, event: string, payload?: unknown): Promise<void>;
        }
      ).fireSubTrigger;
      let memoryBeforeEndOfTurn: number | undefined;
      let memoryAfterEndOfTurn: number | undefined;
      const spy = vi
        .spyOn(GameEngine.prototype as unknown as { fireSubTrigger: typeof original }, "fireSubTrigger")
        .mockImplementation(async function (this: GameEngine, event: string, payload?: unknown) {
          if (event === "endOfTurn") memoryBeforeEndOfTurn = h.state.memory;
          const result = await original.call(this, event, payload);
          if (event === "endOfTurn") memoryAfterEndOfTurn = h.state.memory;
          return result;
        });

      let memoryAfterGain: number | undefined;
      await driveTurn(h, 0, async () => {
        const result = h.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
        expect(result).toEqual({ ok: true });
        await settle(() => h.state.memory !== 0, 100);
        memoryAfterGain = h.state.memory;
      });

      spy.mockRestore();

      // The "gain 2" half is immediate: memory moved +2 the instant the Option resolved.
      expect(memoryAfterGain).toBe(2);
      // The "lose 2" half is genuinely PENDING — deferred until the predetermined end-of-turn
      // timing, observed as an exact -2 delta bracketing the real OnEndTurn watcher window,
      // not baked into the immediate on-play resolution.
      expect(memoryBeforeEndOfTurn).toBeDefined();
      expect(memoryAfterEndOfTurn).toBeDefined();
      expect((memoryAfterEndOfTurn as number) - (memoryBeforeEndOfTurn as number)).toBe(-2);
    },
  );
});

describe("§18-2 Overwrite Processing (comprehensive-0268)", () => {
  it(
    "NOW MET: with a [Kiriha Aonuma] in play and a [MetalGreymon] in the trash, BT10-019's printed 'instead' clause should let the player return it to hand INSTEAD of the default reveal-top-4 processing",
    async () => {
      cite(
        "comprehensive-0268",
        "DIVERGENCE: §18-2-1/18-2-2 overwrite processing ('instead' text) with an OPTIONAL " +
          "overwrite — the rule's OWN example is BT10-019's exact printed text: '[On Play] Reveal " +
          "the top 4 cards of your deck. Add 2 cards with [Blue Flare]... When you have [Kiriha " +
          "Aonuma], you may return 1 [MetalGreymon] from your trash to your hand instead.' Worse " +
          "than merely unreachable: BT10-019.ts's hasKirihaAonuma() reads `p.topCardId` on every " +
          "battle-area permanent to find its definition, but `Permanent` (packages/shared) has no " +
          "`topCardId` field (the real field is `topCard.cardId`) — `definitionOf({instanceId: " +
          "undefined}).cardId` throws 'Unknown cardId: undefined' the instant the owner has ANY " +
          "battle-area permanent (guaranteed here: Kiriha itself). GameEngine.ts's handlePlayCard " +
          "catches this at the top-level applyPlayCard.catch, logs it, and emits `actionRejected` " +
          "— so BOTH branches (reveal-4 AND the 'instead' return) fail to run; the entire [On " +
          "Play] effect is inert whenever the rule's own precondition (a [Kiriha Aonuma] in play) " +
          "holds, not just the optional branch.",
      );

      const kirihaDef = requireCardDefinition("BT10-088"); // real [Kiriha Aonuma] Tamer
      expect(kirihaDef.nameEn).toBe("Kiriha Aonuma");
      const metalDef = requireCardDefinition("BT10-024"); // real [MetalGreymon] Digimon
      expect(metalDef.nameEn).toBe("MetalGreymon");

      const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      p0.battleArea.push(digimon(0, 0, "BT10-088")); // [Kiriha Aonuma] in play
      const metalInTrash = instance("BT10-024", 0, true);
      p0.trash.push(metalInTrash); // a [MetalGreymon] in the trash
      for (let i = 0; i < 6; i += 1) p0.deck.push(instance("AD1-001", 0, false)); // non-empty deck

      const greymon = instance("BT10-019", 0, false);
      p0.hand.push(greymon);
      const def = requireCardDefinition("BT10-019");
      s.state.memory = def.playCost;

      const result = s.engine.applyIntent(0, { type: "playCard", instanceId: greymon.instanceId });
      expect(result).toEqual({ ok: true });
      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT10-019"), 200);
      await settle(() => false, 60);

      // EXPECTED (per §18-2-2): the "instead" processing was available and usable — the
      // MetalGreymon ends up back in hand instead of the default reveal-top-4 running.
      expect(p0.hand.some((c) => c.instanceId === metalInTrash.instanceId)).toBe(true);
    },
  );
});

// §18-2-4 Overwrite processing for immediate-type effects can't be interrupted — NOT TESTABLE.
markNotTestable(
  "comprehensive-0269",
  "18-2-4's own worked example ('when a digivolution card would be trashed from ANOTHER of " +
    "your Digimon, you may trash one from THIS Digimon instead, and it can't be interrupted') " +
    "has no matching real card in the corpus (searched effectText for the redirect-trash-from- " +
    "a-different-Digimon shape; no hit). More fundamentally, this engine has no 'immediate-type " +
    "effect' concept distinct from a normal triggered/replacement effect (EffectTiming, " +
    "packages/shared/src/schema/enums.ts, carries no such variant), so there is no runtime seam " +
    "to assert 'can't be interrupted' against — no decision/priority window is ever modeled as " +
    "opening between an overwrite's trigger and its resolution for ANY effect, immediate or " +
    "not, so this clause's specific claim (interruption is possible for OTHER effect kinds but " +
    "not this one) cannot be distinguished behaviorally from ordinary effect atomicity.",
);

describe("§18-3 Infinite Loops (comprehensive-0270)", () => {
  it(
    "NOW MET: when the rule-check fixpoint can't converge, the match should end in a draw (§18-3-2), not throw an engine error",
    async () => {
      cite(
        "comprehensive-0270",
        "DIVERGENCE: §18-3-2 'If an infinite loop occurs and neither player has the ability to " +
          "stop it, that game ends in a draw.' GameEngine.ts's ruleProcess() fixpoint (and " +
          "effects/stack.ts's resolveTiming fixpoint) both guard against non-termination with a " +
          "hardcoded pass cap (MAX_RULE_PROCESS_PASSES / MAX_RESOLUTION_PASSES = 1000) that " +
          "THROWS a plain Error on overflow — there is no draw-outcome branch anywhere in this " +
          "path (contrast security/winCheck.ts's real `{ outcome: 'draw' }` emit for simultaneous " +
          "double-loss, which exists but is never reached from here). The cap is lowered to 0 " +
          "below (via a runtime override of the class's own static field) so the SAME throw " +
          "statement a genuine runaway loop would hit is reached deterministically and fast, " +
          "without needing to actually construct 1000 real passes.",
      );

      const s = setup();
      const engineCtor = GameEngine as unknown as { MAX_RULE_PROCESS_PASSES: number };
      const original = engineCtor.MAX_RULE_PROCESS_PASSES;
      engineCtor.MAX_RULE_PROCESS_PASSES = 0;
      try {
        const p0 = s.state.players[0] as PlayerState;
        const violator = digimon(0, 0); // one real §17-1-3-1-1 violation is enough to trip pass #1
        p0.battleArea.push(violator);

        const engineAny = s.engine as unknown as { ruleProcess(): Promise<void> };

        // EXPECTED (per §18-3-2): this resolves the match to a draw, it does not reject/throw.
        await expect(engineAny.ruleProcess()).resolves.toBeUndefined();
        expect(s.state.gameOver).toBe(true);
        expect(s.events.some((e) => e.kind === "gameOver" && "result" in e && e.result?.outcome === "draw")).toBe(
          true,
        );
      } finally {
        engineCtor.MAX_RULE_PROCESS_PASSES = original;
      }
    },
  );

  it("§18-3-3's turn-player/non-turn-player 'declare a repeat count' stop procedure has no protocol representation", () => {
    cite(
      "comprehensive-0270",
      "18-3-3-1/18-3-3-2: the turn player, then the non-turn player, DECLARE a number of times to " +
        "repeat the loop before it's allowed to stop — a player-facing decision distinct from any " +
        "existing DecisionRequest kind",
    );
    // DECISION_KINDS (packages/shared/src/protocol/events.ts) is runtime-pinned to the
    // DecisionRequest.kind union in BOTH directions (a typecheck-enforced completeness guard —
    // see that file's own comment), so this is a real exhaustiveness check, not a guess: no
    // member for "declare a repeat count" exists — §18-3-3's declare-and-execute procedure has
    // no engine/protocol counterpart today.
    expect(DECISION_KINDS).not.toContain("declareLoopRepeatCount");
  });
});

// Update History (comprehensive-0271, 0272): a version-by-version changelog of what earlier
// rulebook revisions changed (e.g. "Updated 4-25. Updated 8-2. ..."). Non-normative by
// construction — it documents the document's own edit history, not current game rules.
markNotTestable(
  "comprehensive-0271",
  "Update History changelog entry (rulebook revision log), not current rule content.",
);
markNotTestable(
  "comprehensive-0272",
  "Update History changelog entry (rulebook revision log), not current rule content.",
);
