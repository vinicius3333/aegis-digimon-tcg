import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { BotPlayer } from "../BotPlayer.js";
import { buildBotView } from "../view.js";
import { createObservationHistory, HISTORY_LIMIT } from "./history.js";
import { trainingObservation } from "./observation.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("permitted policy history", () => {
  it("retains seen identities after the bounded event window expires, without hidden-location claims", () => {
    const history = createObservationHistory();
    history.observeEvent({ kind: "cardRevealed", seat: 1, cardId: "EX9-047" });
    for (let index = 0; index < HISTORY_LIMIT + 1; index++)
      history.observeEvent({ kind: "securityRecovered", seat: 0, amount: 1 });
    expect(history.snapshot().seenCardIds).toEqual(["EX9-047"]);
    expect(history.snapshot().recent).toHaveLength(HISTORY_LIMIT);
    expect(history.snapshot().recent.every((event) => event.kind === "securityRecovered")).toBe(true);
    const copy = history.snapshot();
    copy.seenCardIds.push("BT9-112");
    copy.recent[0]!.cardIds.push("BT9-112");
    expect(history.snapshot().seenCardIds).toEqual(["EX9-047"]);
    expect(history.snapshot().recent[0]!.cardIds).toEqual([]);
    history.observeEvent({ kind: "matchStarted", firstSeat: 0 });
    expect(history.snapshot()).toEqual({ seenCardIds: [], knownCards: [], recent: [] });
  });

  it.each([0, 1] as const)(
    "seat %i remembers distinct copies and observed ownership across hidden moves",
    async (seat) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: { hand: ["EX9-046", "EX9-046"] },
        [opponent]: { trash: ["EX9-046"] },
      });
      await setup.ready();
      const history = createObservationHistory();
      const observation = trainingObservation(setup.state, seat);
      history.observe(observation);
      history.observe(observation);
      const expected = [
        ...setup.state.players[seat]!.hand.map((card) => ({
          instanceId: card.instanceId,
          cardId: "EX9-046",
          ownerSeat: seat,
        })),
        ...setup.state.players[opponent]!.trash.map((card) => ({
          instanceId: card.instanceId,
          cardId: "EX9-046",
          ownerSeat: opponent,
        })),
      ].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
      expect(history.snapshot().knownCards).toEqual(expected);
      // Once visible cards move into an unobserved deck, memory must neither disappear nor track their location.
      for (const player of setup.state.players) {
        player.deck.push(...player.hand.splice(0), ...player.trash.splice(0));
      }
      history.observe(trainingObservation(setup.state, seat));
      for (let index = 0; index <= HISTORY_LIMIT; index++)
        history.observeEvent({ kind: "cardRevealed", seat: opponent, cardId: "EX9-046" });
      expect(history.snapshot().knownCards).toEqual(expected);
      const copy = history.snapshot();
      copy.knownCards[0]!.cardId = "BT9-112";
      expect(history.snapshot().knownCards).toEqual(expected);
      history.observeEvent({ kind: "matchStarted", firstSeat: seat });
      expect(history.snapshot()).toEqual({ seenCardIds: [], knownCards: [], recent: [] });
    },
  );

  it.each([0, 1] as const)(
    "seat %i upgrades unknown reveal ownership without counting the copy twice",
    async (seat) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({ [opponent]: { deck: ["EX9-047"] } });
      await setup.ready();
      const card = setup.state.players[opponent]!.deck[0]!;
      const history = createObservationHistory();
      const reveal = trainingObservation(setup.state, seat, {
        decisionId: "permitted-reveal",
        seat,
        kind: "selectCards",
        promptText: "Look",
        options: { visibleCards: [{ instanceId: card.instanceId, cardId: card.cardId }] },
      });
      history.observe(reveal);
      expect(history.snapshot().knownCards).toEqual([{ instanceId: card.instanceId, cardId: card.cardId }]);
      setup.state.players[opponent]!.trash.push(...setup.state.players[opponent]!.deck.splice(0));
      history.observe(trainingObservation(setup.state, seat));
      history.observe(reveal);
      expect(history.snapshot().knownCards).toEqual([
        { instanceId: card.instanceId, cardId: card.cardId, ownerSeat: opponent },
      ]);
    },
  );

  it.each([0, 1] as const)("seat %i preserves own permitted reveals and ignores hidden mutations", async (seat) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: { hand: ["EX9-046"], deck: ["EX9-047"], security: ["EX9-048"] },
      [opponent]: {
        hand: ["BT9-112"],
        deck: ["EX9-057"],
        security: ["EX9-054"],
        battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT25-032", as: "hidden", faceUp: false }] }],
      },
    });
    await setup.ready();
    const history = createObservationHistory();
    history.observe(trainingObservation(setup.state, seat));
    const before = history.snapshot();
    expect(before.seenCardIds).toEqual(["EX9-046", "ST23-13"]);
    setup.state.players[opponent]!.hand[0]!.cardId = "EX9-055";
    setup.state.players[opponent]!.deck[0]!.cardId = "EX9-055";
    setup.state.players[seat]!.security[0]!.cardId = "EX9-055";
    setup.inst("hidden").cardId = "EX9-055";
    history.observe(trainingObservation(setup.state, seat));
    expect(history.snapshot()).toEqual(before);
    history.observe(
      trainingObservation(setup.state, seat, {
        decisionId: "private",
        seat,
        kind: "selectCards",
        promptText: "Look",
        options: { visibleCards: [{ instanceId: "temporary", cardId: "EX9-047" }] },
      }),
    );
    history.observe(trainingObservation(setup.state, seat));
    expect(history.snapshot().seenCardIds).toEqual(["EX9-046", "EX9-047", "ST23-13"]);
    const other = createObservationHistory();
    other.observe(trainingObservation(setup.state, opponent));
    expect(other.snapshot().seenCardIds).not.toContain("EX9-047");
    expect(() =>
      trainingObservation(setup.state, opponent, {
        decisionId: "private",
        seat,
        kind: "optional",
        promptText: "Private",
      }),
    ).toThrow("Cannot observe another player's private decision");
  });

  it.each([0, 1] as const)(
    "seat %i receives public reveal history through BotPlayer and keeps it across turns",
    async (seat) => {
      const setup = setupEngine({ [seat]: { hand: ["EX9-046"] } });
      setup.state.turnSeat = seat;
      await setup.ready();
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        windows.push(window);
        return window.actions.findIndex(({ intent }) => intent.type === "endPhase");
      });
      const bot = new BotPlayer(seat, setup.state, () => {}, { policy });
      bot.onEvent({ kind: "cardRevealed", seat: seat === 0 ? 1 : 0, cardId: "EX9-047" });
      policy.onTurnStart();
      await policy.chooseMainAction(buildBotView(setup.state, seat)!);
      expect(windows[0]!.observation.history).toEqual({
        seenCardIds: ["EX9-046", "EX9-047"],
        knownCards: [
          { instanceId: setup.state.players[seat]!.hand[0]!.instanceId, cardId: "EX9-046", ownerSeat: seat },
        ],
        recent: [{ kind: "cardRevealed", seat: seat === 0 ? 1 : 0, cardIds: ["EX9-047"] }],
      });
      bot.dispose();
      bot.onEvent({ kind: "cardRevealed", seat, cardId: "BT9-112" });
      await policy.chooseMainAction(buildBotView(setup.state, seat)!);
      expect(windows[1]!.observation.history).toEqual(windows[0]!.observation.history);
    },
  );
});
