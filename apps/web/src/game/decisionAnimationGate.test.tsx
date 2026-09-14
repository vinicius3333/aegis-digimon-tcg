// @vitest-environment jsdom
import { type DecisionRequest, type ServerEvent } from "@aegis/shared";
import { act, cleanup, render, screen } from "@testing-library/react";
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

it.each([false, true])(
  "waits for every trashed security card before the order-trigger dialog (split decision: %s)",
  async (split) => {
    vi.useFakeTimers();
    const state = createArenaDemoState();
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
  },
);
