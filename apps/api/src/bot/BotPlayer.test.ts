import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Phase,
  SECURITY_CHECK_NARRATION_MS,
  SECURITY_DESTRUCTION_NARRATION_MS,
  Zone,
  type DecisionRequest,
  type GameState,
  type Intent,
  type ServerEvent,
} from "@aegis/shared";
import {
  BotPlayer,
  COMBAT_REFLEX_MAX_MS,
  COMBAT_REFLEX_MIN_MS,
  DEFAULT_MAX_ACTION_DELAY_MS,
  DEFAULT_MIN_ACTION_DELAY_MS,
} from "./BotPlayer.js";

/**
 * Pacing and wiring tests for the bot seat.
 *
 * These pin `BotPlayer`'s plumbing — the think delay, the resume-after-combat handshake,
 * the recovery from a rejected intent, and decision routing — not the evaluation itself,
 * which `evaluate.test.ts` covers directly.
 *
 * The board fixture now carries the engine's attack projections (`canAttackPlayer`,
 * `attackablePermanentIds`) because the policy reads attack legality from them rather
 * than re-deriving it from suspension, and a real opponent PlayerState because the
 * evaluation compares both boards. Both are what the engine actually publishes.
 */
function botState() {
  const attackers = [
    {
      permanentId: "large",
      topCard: { cardId: "BT1-013" }, // Muchomon, Lv.3 5000 DP
      currentDP: 5_000,
      isSuspended: false,
      keywords: [],
      canAttackPlayer: true,
      attackablePermanentIds: [],
    },
    {
      permanentId: "small",
      topCard: { cardId: "BT1-009" }, // Monodramon, Lv.3 3000 DP
      currentDP: 2_000,
      isSuspended: false,
      keywords: [],
      canAttackPlayer: true,
      attackablePermanentIds: [],
    },
  ];
  return {
    attackers,
    state: {
      gameOver: false,
      turnSeat: 1,
      turnCount: 1,
      phase: Phase.Main,
      memory: 3,
      pendingDecision: undefined,
      players: [
        { hand: [], battleArea: [], security: [1, 2, 3, 4, 5], trash: [], deck: [], eggDeck: [] },
        { hand: [], battleArea: attackers, security: [1, 2, 3, 4, 5], trash: [], deck: [], eggDeck: [] },
      ],
    } as unknown as GameState,
  };
}

/* The plumbing tests below pin the handshakes, not the default pace, so they run
   the seat on a fixed think time. The default window — deliberately a range, so a
   run of actions does not tick out metronomically — is pinned by its own test. */
const FIXED_THINK = { minThinkMs: 2_000, maxThinkMs: 2_000 };

async function advance(milliseconds: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await Promise.resolve();
}

describe("BotPlayer action pacing and player attacks", () => {
  afterEach(() => vi.useRealTimers());

  it("waits two seconds, then attacks the player with its strongest eligible Digimon", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    await advance(1_999);
    expect(intents).toEqual([]);

    await advance(1);
    expect(intents).toEqual([
      {
        type: "attack",
        attackerPermanentId: "large",
        target: { kind: "player" },
      },
    ]);
  });

  it("waits another two seconds before the next attack after combat settles", async () => {
    vi.useFakeTimers();
    const { state, attackers } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        if (intent.type === "attack") {
          const attacker = attackers.find((candidate) => candidate.permanentId === intent.attackerPermanentId);
          if (attacker) {
            attacker.isSuspended = true;
            attacker.canAttackPlayer = false; // the engine clears the projection once suspended
          }
        }
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    await advance(2_000);
    bot.onActionSettled("attack");
    await advance(1_999);
    expect(intents).toHaveLength(1);

    await advance(1);
    expect(intents[1]).toEqual({
      type: "attack",
      attackerPermanentId: "small",
      target: { kind: "player" },
    });
  });

  it("does not stall when the strongest attacker is rejected", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return intent.type === "attack" && intent.attackerPermanentId === "large"
          ? { ok: false, reason: "illegal-target" }
          : { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    await advance(2_000);
    expect(intents).toHaveLength(1);

    await advance(2_000);
    expect(intents[1]).toEqual({
      type: "attack",
      attackerPermanentId: "small",
      target: { kind: "player" },
    });
  });

  it("answers orderCards with the complete server-offered order", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );
    const request = {
      decisionId: "dec-order",
      seat: 1,
      kind: "orderCards",
      promptText: "Order cards",
      options: { candidateInstanceIds: ["card-c", "card-a", "card-b"] },
    } satisfies DecisionRequest;

    bot.onDecisionRequested(request);
    await advance(2_000);

    expect(intents).toEqual([
      {
        type: "respondDecision",
        decisionId: "dec-order",
        response: { kind: "orderCards", order: ["card-c", "card-a", "card-b"] },
      },
    ]);
  });

  // The benchmark decks are mono-color BT1 lists that print no ＜Counter＞, ＜Alliance＞,
  // ＜Evade＞ or ＜Barrier＞, so a bot-vs-bot series structurally cannot open three of the
  // five combat windows. These synthetic-event tests are the only coverage those paths get,
  // and each one is a wedged match if it regresses.
  it("answers the combat windows that block the engine until the seat responds", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    // The prompts below target the defending seat, so put the opponent on turn.
    state.turnSeat = 0;
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({
      kind: "counterWindowOpened",
      attackerPermanentId: "atk",
      defendingSeat: 1,
      eligibleCounters: [{ instanceId: "i-1", effectKey: "0", description: "counter" }],
    } as ServerEvent);
    bot.onEvent({ kind: "evadePrompt", permanentId: "large" } as ServerEvent);
    bot.onEvent({ kind: "barrierPrompt", permanentId: "small" } as ServerEvent);
    await advance(2_000);

    expect(intents).toContainEqual({
      type: "respondCounter",
      sourceInstanceId: "i-1",
      effectKey: "0",
    });
    expect(intents).toContainEqual({ type: "respondEvade", permanentId: "large", accept: true });
    // Barrier trashes a security card; a 5000 DP Lv.3 body is not worth one.
    expect(intents).toContainEqual({ type: "respondBarrier", permanentId: "small", accept: false });
  });

  it("answers the alliance prompt, taking an ally only against a contested board", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({
      kind: "alliancePrompt",
      permanentId: "large",
      eligibleAllyIds: ["small"],
    } as ServerEvent);
    await advance(2_000);
    // Seat 0's board is empty, so there is nothing the extra DP would beat.
    expect(intents).toEqual([{ type: "respondAlliance" }]);

    state.players[0]!.battleArea = [
      { permanentId: "enemy", topCard: { cardId: "BT1-015" }, currentDP: 4_000, isSuspended: false },
    ] as never;
    bot.onEvent({
      kind: "alliancePrompt",
      permanentId: "large",
      eligibleAllyIds: ["small"],
    } as ServerEvent);
    await advance(2_000);

    expect(intents[1]).toEqual({ type: "respondAlliance", allyPermanentId: "small" });
  });

  it("paces its default think time inside the window the client narration needs", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(1, state, (intent) => {
      intents.push(intent);
      return { ok: true };
    });

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    // Nothing before the floor: every action the client narrates has to stay
    // readable until the next one displaces it.
    await advance(DEFAULT_MIN_ACTION_DELAY_MS - 1);
    expect(intents).toEqual([]);

    await advance(DEFAULT_MAX_ACTION_DELAY_MS - DEFAULT_MIN_ACTION_DELAY_MS + 1);
    expect(intents).toHaveLength(1);
  });

  // The engine holds the whole attack on this answer and the attacking client holds its
  // target arrow up for the same window, so a think time here is a visible stall between
  // the arrow reaching security and the battle animation.
  it("answers a block window on a reflex rather than a think time", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    state.turnSeat = 0;
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({
      kind: "blockWindowOpened",
      attackerPermanentId: "atk",
      eligibleBlockerIds: ["large"],
    } as ServerEvent);
    await advance(COMBAT_REFLEX_MIN_MS - 1);
    expect(intents).toEqual([]);

    await advance(COMBAT_REFLEX_MAX_MS - COMBAT_REFLEX_MIN_MS + 1);
    expect(intents).toHaveLength(1);
  });

  // The check owns the centre of the opposing screen until its scene fades. A second
  // action inside that window is played over a board the human is still watching.
  it("waits out the security narration before acting again after an attack", async () => {
    vi.useFakeTimers();
    const { state, attackers } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        if (intent.type === "attack") {
          const attacker = attackers.find((candidate) => candidate.permanentId === intent.attackerPermanentId);
          if (attacker) {
            attacker.isSuspended = true;
            attacker.canAttackPlayer = false;
          }
        }
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    await advance(2_000);
    expect(intents).toHaveLength(1);

    bot.onEvent({ kind: "securityChecked", seat: 0, revealedCardId: "BT1-013", resolution: "trashed" } as ServerEvent);
    bot.onActionSettled("attack");
    // Longer than the think time the same seat would otherwise have taken.
    await advance(SECURITY_CHECK_NARRATION_MS - 1);
    expect(intents).toHaveLength(1);

    await advance(1);
    expect(intents).toHaveLength(2);
  });

  // An effect that spends a security stack is narrated card by card, so the whole run
  // owes its budget before the bot may play anything over it.
  it("waits out one narration per security card an effect trashed", async () => {
    vi.useFakeTimers();
    const { state, attackers } = botState();
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        if (intent.type === "attack") {
          const attacker = attackers.find((candidate) => candidate.permanentId === intent.attackerPermanentId);
          if (attacker) {
            attacker.isSuspended = true;
            attacker.canAttackPlayer = false;
          }
        }
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 1 } as ServerEvent);
    await advance(2_000);
    expect(intents).toHaveLength(1);

    bot.onEvent({
      kind: "cardsMoved",
      instanceIds: ["sec-1", "sec-2"],
      from: Zone.Security,
      to: Zone.Trash,
    } as ServerEvent);
    bot.onActionSettled("attack");
    await advance(2 * SECURITY_DESTRUCTION_NARRATION_MS - 1);
    expect(intents).toHaveLength(1);

    await advance(1);
    expect(intents).toHaveLength(2);
  });

  it("ignores combat prompts aimed at permanents it does not control", async () => {
    vi.useFakeTimers();
    const { state } = botState();
    state.turnSeat = 0;
    const intents: Intent[] = [];
    const bot = new BotPlayer(
      1,
      state,
      (intent) => {
        intents.push(intent);
        return { ok: true };
      },
      FIXED_THINK,
    );

    bot.onEvent({ kind: "evadePrompt", permanentId: "not-mine" } as ServerEvent);
    await advance(2_000);

    expect(intents).toEqual([]);
  });
});
