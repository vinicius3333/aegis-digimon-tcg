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
    expect(history.snapshot()).toEqual({ seenCardIds: [], recent: [] });
  });

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
        recent: [{ kind: "cardRevealed", seat: seat === 0 ? 1 : 0, cardIds: ["EX9-047"] }],
      });
      bot.dispose();
      bot.onEvent({ kind: "cardRevealed", seat, cardId: "BT9-112" });
      await policy.chooseMainAction(buildBotView(setup.state, seat)!);
      expect(windows[1]!.observation.history).toEqual(windows[0]!.observation.history);
    },
  );
});
