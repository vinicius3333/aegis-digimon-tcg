import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GameState, PlayerState, type MatchReplay } from "@aegis/shared";
import { I18nProvider } from "@/i18n";
import { ReplayPlayer } from "@/replays/ReplayPlayer";
import { validateReplay } from "@/replays/validation";
import type { PresentationProbe } from "@/game/presentationProbe";

const playback = vi.hoisted(() => ({ idle: true }));
vi.mock("../game/GameScreen", () => ({
  GameScreen: ({ devProbe, demoConnection }: { devProbe: PresentationProbe; demoConnection: { state: GameState } }) => {
    useEffect(() => {
      playback.idle = !demoConnection.state.gameOver;
      devProbe.onQueue?.({
        queue: {
          isIdle: () => playback.idle,
          setRate: vi.fn<(rate: number) => void>(),
          resume: vi.fn<() => void>(),
          pause: vi.fn<() => void>(),
        },
      } as unknown as Parameters<NonNullable<PresentationProbe["onQueue"]>>[0]);
    }, [devProbe, demoConnection.state]);
    return <div>Replay board</div>;
  },
}));
vi.mock("./ReplayRecording", () => ({
  ReplayRecording: ({ finished }: { finished: boolean }) => (
    <output data-testid="recording-finished">{String(finished)}</output>
  ),
}));

function buildReplay(): MatchReplay {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    state.players.push(Object.assign(new PlayerState(), { seat, displayName: `Player ${seat}` }));
  }
  state.stateVersion = 1;
  const first = state.toJSON() as unknown as GameState;
  state.stateVersion = 2;
  state.gameOver = true;
  state.winnerSeat = 0;
  return {
    id: "ending",
    mode: "casual",
    players: ["Player 0", "Player 1"],
    startedAt: 0,
    finishedAt: 10_000,
    winnerSeat: 0,
    frameCount: 2,
    format: "aegis-replay",
    version: 1,
    viewerSeat: 0,
    visibleHandSeats: [0, 1],
    frames: [
      { atMs: 0, state: first, events: [] },
      {
        atMs: 1000,
        state: state.toJSON() as unknown as GameState,
        events: [
          {
            kind: "gameOver",
            result: { outcome: "win", winnerSeat: 0 },
            reason: "surrender",
            seq: 1,
            batch: "end",
            stateVersion: 2,
          },
        ],
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("shows the result only after final animations settle and holds it for two real seconds before stopping recording", () => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render(
    <I18nProvider>
      <ReplayPlayer replay={buildReplay()} onClose={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("Victory")).toBeNull();
  expect(screen.getByTestId("recording-finished").textContent).toBe("false");
  act(() => {
    playback.idle = true;
    vi.advanceTimersByTime(50);
  });
  expect(screen.getByText("Victory")).toBeTruthy();
  expect(screen.getByText("Your opponent surrendered.")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1999));
  expect(screen.getByTestId("recording-finished").textContent).toBe("false");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByTestId("recording-finished").textContent).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Go to start" }));
  expect(screen.getByTestId("recording-finished").textContent).toBe("false");
  expect(screen.queryByText("Victory")).toBeNull();
});

it("accepts legacy replays and bounded optional deck snapshots but rejects malformed metadata", () => {
  const legacy = buildReplay();
  expect(validateReplay(legacy)).toBe(true);
  const replay = {
    ...legacy,
    decks: [{ deckName: "Starter", mainDeck: ["BT1-010"], eggDeck: [] }, null],
    deckIcons: ["BT1-010", null],
  };
  expect(validateReplay(replay)).toBe(true);
  expect(validateReplay({ ...replay, decks: [replay.decks[0]] })).toBe(false);
  expect(validateReplay({ ...replay, deckIcons: ["BT1-010", "PRIVATE"] })).toBe(false);
  expect(
    validateReplay({ ...replay, decks: [{ ...replay.decks[0], mainDeck: Array(101).fill("BT1-010") }, null] }),
  ).toBe(false);
});

it("waits for final animations when stepping to the last action while paused", () => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render(
    <I18nProvider>
      <ReplayPlayer replay={buildReplay()} onClose={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next action" }));
  expect(screen.queryByText("Victory")).toBeNull();
  act(() => {
    playback.idle = true;
    vi.advanceTimersByTime(50);
  });
  expect(screen.getByText("Victory")).toBeTruthy();
  expect(screen.getByTestId("recording-finished").textContent).toBe("false");
});

it.each([
  { viewerSeat: 0 as const, visibleHandSeats: [0, 1] as const, offered: true },
  { viewerSeat: -1 as const, visibleHandSeats: [1] as const, offered: true },
  { viewerSeat: -1 as const, visibleHandSeats: [] as const, offered: false },
])(
  "offers the recorded hand setting only when the replay holds a hand (viewer $viewerSeat, hands $visibleHandSeats)",
  ({ viewerSeat, visibleHandSeats, offered }) => {
    Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    render(
      <I18nProvider>
        <ReplayPlayer
          replay={{ ...buildReplay(), viewerSeat, visibleHandSeats: [...visibleHandSeats] }}
          onClose={vi.fn<() => void>()}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("combobox", { name: "Recorded hand" }) !== null).toBe(offered);
    expect(screen.getByRole("combobox", { name: "Turn" })).toBeTruthy();
  },
);

it("accepts spectator replays with or without recorded hands", () => {
  const spectator = { ...buildReplay(), viewerSeat: -1 };
  expect(validateReplay({ ...spectator, visibleHandSeats: [] })).toBe(true);
  expect(validateReplay({ ...spectator, visibleHandSeats: [0, 1] })).toBe(true);
  expect(validateReplay({ ...spectator, visibleHandSeats: [1, 1] })).toBe(false);
});

it("validates decision analysis carried by a replay file", () => {
  const replay = buildReplay();
  const decision = {
    frameIndex: 0,
    inputIndex: 3,
    seat: 0,
    turn: 0,
    context: "mulligan",
    options: [{ action: "keepHand" }, { action: "mulligan" }],
    chosen: [0],
  };
  expect(validateReplay({ ...replay, decisions: [decision] })).toBe(true);
  expect(validateReplay({ ...replay, decisions: [{ ...decision, chosen: [2] }] })).toBe(false);
  expect(validateReplay({ ...replay, decisions: [{ ...decision, frameIndex: 2 }] })).toBe(false);
  expect(validateReplay({ ...replay, decisions: [{ ...decision, options: [{ action: "constructor" }] }] })).toBe(false);
  expect(validateReplay({ ...replay, decisions: [{ ...decision, context: "toString" }] })).toBe(false);
});

it("explains how the game ended and lists each decision with its chosen and other options", () => {
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  const scrollIntoView = vi.fn<() => void>();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const decisions: MatchReplay["decisions"] = [
    {
      frameIndex: 0,
      inputIndex: 2,
      seat: 1,
      turn: 0,
      context: "mulligan",
      options: [{ action: "keepHand" }, { action: "mulligan" }],
      chosen: [1],
    },
  ];
  render(
    <I18nProvider>
      <ReplayPlayer replay={{ ...buildReplay(), decisions }} onClose={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show analysis" }));
  expect(screen.getByText("Player 0 won on turn 0. Player 1 surrendered.")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Decisions" }));
  expect(screen.getByText("Player 1")).toBeTruthy();
  expect(screen.getByText("Redraw the hand").closest("li")?.hasAttribute("data-chosen")).toBe(true);
  expect(screen.getByText("Other options: 1")).toBeTruthy();
  expect(screen.getByText("Keep the hand").closest("li")?.hasAttribute("data-chosen")).toBe(false);
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
});

it("says when a replay file carries no decision data", () => {
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render(
    <I18nProvider>
      <ReplayPlayer replay={buildReplay()} onClose={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show analysis" }));
  fireEvent.click(screen.getByRole("tab", { name: "Decisions" }));
  expect(screen.getByText(/This replay file has no decision data/)).toBeTruthy();
});

it("keeps experimental ratings off by default and explains a rating as a bot estimate when turned on", () => {
  Object.defineProperty(HTMLElement.prototype, "getAnimations", { configurable: true, value: () => [] });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn<() => void>() });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.removeItem("aegis:replayExperimentalRatings");
  const decisions: MatchReplay["decisions"] = [
    {
      frameIndex: 0,
      inputIndex: 4,
      seat: 0,
      turn: 0,
      context: "main",
      options: [
        {
          action: "endPhase",
          value: 0.2,
          margin: 0.08,
          samples: 8,
          factors: { security: -0.5, board: -0.9, memory: 0.1 },
          facts: { ownSecurity: 3, opponentSecurity: 4, ownDigimon: 1, opponentDigimon: 3, ownHand: 6, memory: 2 },
        },
        {
          action: "play",
          cardId: "BT1-010",
          cost: 3,
          value: 0.62,
          margin: 0.07,
          samples: 8,
          factors: { security: 0.4, board: 0.3, memory: 0.1 },
          facts: { ownSecurity: 5, opponentSecurity: 4, ownDigimon: 3, opponentDigimon: 2, ownHand: 5, memory: 1 },
        },
      ],
      chosen: [0],
      bestOption: 1,
      loss: 0.42,
      lossMargin: 0.09,
      quality: "blunder",
    },
  ];
  render(
    <I18nProvider>
      <ReplayPlayer replay={{ ...buildReplay(), decisions, advantage: [0.5, 0.9] }} onClose={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show analysis" }));
  expect(screen.getByText("Win chance (bot estimate)")).toBeTruthy();
  expect(screen.queryByText("Decision accuracy (bot estimate)")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Decisions" }));
  expect(screen.queryByRole("button", { name: "Blunder (bot estimate)" })).toBeNull();
  expect(screen.queryByText("62%")).toBeNull();
  fireEvent.click(screen.getByRole("switch", { name: /Experimental: rate decisions/ }));
  expect(screen.getByRole("button", { name: "Blunder (bot estimate)" })).toBeTruthy();
  expect(screen.getByText("Lost about 42 win-chance points (±9) against the bot's top pick")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Why the bot rates it this way" }));
  expect(screen.getByText("Digimon on the board: you 3 instead of 1; the opponent 2 instead of 3.")).toBeTruthy();
  expect(screen.getByText("Security: you 5 instead of 3; the opponent 4 instead of 4.")).toBeTruthy();
  expect(screen.getByText("End the phase: 20% ±8 after 8 play-outs")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show best" }));
  expect(screen.getByText("62%")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Bot's best option" })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
  expect(screen.getByText("Decision accuracy (bot estimate)")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Players" }));
  expect(screen.getByRole("columnheader", { name: "Player 0" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Attacks declared" })).toBeTruthy();
  localStorage.removeItem("aegis:replayExperimentalRatings");
});
