// @vitest-environment jsdom
import { type DecisionRequest, type DecisionResponse, type ServerEvent } from "@aegis/shared";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { createArenaDemoState } from "../dev/ArenaDemo";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { SECURITY_BREAK_TOTAL_MS, SECURITY_DESTROY_TOTAL_MS } from "./timings";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function pendingTriggerDecision(split: boolean, timed: boolean) {
  vi.useFakeTimers();
  const state = createArenaDemoState();
  state.matchTimer = timed;
  state.timerRemaining0 = 1;
  const respondDecision = vi.fn<(response: DecisionResponse) => void>();
  const decision: DecisionRequest = {
    decisionId: "order-after-trash",
    seat: 0,
    kind: "orderTriggers",
    stateVersion: 2,
    promptText: "Choose the next pending effect to resolve.",
    options: { triggerKeys: ["source/effect1", "source/effect2"], triggerCardIds: ["P-007", "BT9-109"] },
  };
  const event: ServerEvent = {
    kind: "cardsMoved",
    from: "security",
    to: "trash",
    seat: 1,
    instanceIds: ["security-first", "security-second"],
    cardIds: ["BT1-010", "BT1-011"],
  };
  const view = (batches: readonly ServerBatch[], pending?: DecisionRequest) => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => {}}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          batches,
          events: batches.flatMap((batch) => batch.events),
          decision: pending,
          acknowledgeDecision: () => {},
          respondDecision,
          error: undefined,
          sessionId: state.players[0]!.sessionId,
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view([]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  const batches = [singleServerBatch([event], 1)];
  rendered.rerender(view(batches, split ? undefined : decision));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  if (split) rendered.rerender(view(batches, decision));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return { decision, respondDecision };
}

it.each([false, true])("waits for every security animation without a timer (split: %s)", async (split) => {
  const { decision } = await pendingTriggerDecision(split, false);
  expect(screen.queryByText(decision.promptText!)).toBeNull();
  const duration = 2 * (SECURITY_BREAK_TOTAL_MS + SECURITY_DESTROY_TOTAL_MS);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(duration - 101);
  });
  expect(screen.queryByText(decision.promptText!)).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByText(decision.promptText!)).toBeTruthy();
});

it.each([false, true])("allows a timed response with one second remaining (split: %s)", async (split) => {
  const { decision, respondDecision } = await pendingTriggerDecision(split, true);
  expect(screen.getByText(decision.promptText!)).toBeTruthy();
  const option = document.querySelector<HTMLButtonElement>(".trigger-chooser__option")!;
  expect(option.disabled).toBe(false);
  fireEvent.click(option);
  fireEvent.click(screen.getByRole("button", { name: "Resolve next effect" }));
  expect(respondDecision).toHaveBeenCalledWith({ kind: "orderTriggers", order: ["source/effect1"] });
});

it.each([false, true])("presents the Barrier prompt safely (timed: %s)", async (timed) => {
  vi.useFakeTimers();
  const state = createArenaDemoState();
  state.matchTimer = timed;
  state.timerRemaining0 = 1;
  const barrierPermanentId = state.players[0]!.battleArea[0]!.permanentId;
  const events: ServerEvent[] = [
    {
      kind: "cardsMoved",
      from: "security",
      to: "trash",
      seat: 1,
      instanceIds: ["security-first", "security-second"],
      cardIds: ["BT1-010", "BT1-011"],
    },
    { kind: "barrierPrompt", permanentId: barrierPermanentId },
  ];
  const view = (batches: readonly ServerBatch[]) => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => {}}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          batches,
          events: batches.flatMap((batch) => batch.events),
          decision: undefined,
          acknowledgeDecision: () => {},
          error: undefined,
          sessionId: state.players[0]!.sessionId,
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view([]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  rendered.rerender(view([singleServerBatch(events, 1)]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  expect(screen.queryByText("Yes, trash security") !== null).toBe(timed);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2 * (SECURITY_BREAK_TOTAL_MS + SECURITY_DESTROY_TOTAL_MS));
  });
  expect(screen.getByRole("button", { name: "Yes, trash security" }).hasAttribute("disabled")).toBe(false);
});

it("makes a newly played target selectable in the central dialog while a timed security sequence is still running", async () => {
  vi.useFakeTimers();
  const state = createArenaDemoState();
  state.matchTimer = true;
  state.timerRemaining0 = 1;
  const target = state.players[1]!.battleArea[0]!;
  const respondDecision = vi.fn<(response: DecisionResponse) => void>();
  const decision: DecisionRequest = {
    decisionId: "target-after-trash",
    seat: 0,
    kind: "chooseTargets",
    stateVersion: 2,
    promptText: "Choose the newly played target.",
    options: { candidateInstanceIds: [target.permanentId], min: 1, max: 1 },
  };
  const securityBatch = singleServerBatch(
    [
      {
        kind: "cardsMoved",
        from: "security",
        to: "trash",
        seat: 1,
        instanceIds: ["security-first", "security-second"],
        cardIds: ["BT1-010", "BT1-011"],
      },
    ],
    1,
  );
  const playBatch = singleServerBatch(
    [{ kind: "cardPlayed", seat: 1, cardId: target.topCard.cardId, permanentId: target.permanentId }],
    2,
  );
  const view = (batches: readonly ServerBatch[], pending?: DecisionRequest) => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => {}}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          batches,
          events: batches.flatMap((item) => item.events),
          decision: pending,
          acknowledgeDecision: () => {},
          respondDecision,
          error: undefined,
          sessionId: state.players[0]!.sessionId,
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view([]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  rendered.rerender(view([securityBatch]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  rendered.rerender(view([securityBatch, playBatch]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  // This fixture actually has a non-skippable scene in front of a hidden arrival.
  expect(screen.getByTestId("security-clash")).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[style*="visibility: hidden"]')).not.toBeNull();
  rendered.rerender(view([securityBatch, playBatch], decision));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.queryByTestId("security-clash")).toBeNull();
  const dialog = screen.getByRole("dialog");
  expect(dialog.getAttribute("data-prompt-surface")).toBe("center");
  const candidate = dialog.querySelector<HTMLElement>(".decision-overlay__candidate")!;
  expect(candidate).not.toBeNull();
  expect(candidate.style.visibility).not.toBe("hidden");
  fireEvent.click(candidate);
  fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
  expect(respondDecision).toHaveBeenCalledWith({ kind: "chooseTargets", instanceIds: [target.permanentId] });
});
