// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Phase,
  PlayerState,
  type DecisionRequest,
  type DecisionResponse,
} from "@aegis/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { GameScreen } from "./GameScreen";
import { matchesMediaQuery, type Viewport } from "./style/viewportCascade";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<(kind: string) => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

function renderDecision(
  initial: DecisionRequest,
  viewport: Viewport | undefined,
  seat: 0 | 1,
  cards: readonly (readonly [string, string])[],
) {
  const originalMatchMedia = window.matchMedia;
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  if (viewport) {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  }
  window.matchMedia = ((query: string) => ({
    ...originalMatchMedia(query),
    matches: query.includes("prefers-reduced-motion") || (viewport ? matchesMediaQuery(query, viewport) : false),
  })) as typeof window.matchMedia;
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = seat;
  state.memory = 5;
  for (const playerSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = playerSeat;
    player.sessionId = `session-${playerSeat}`;
    state.players.push(player);
  }
  for (const [instanceId, cardId] of cards) {
    const card = new CardInstance();
    card.instanceId = instanceId;
    card.cardId = cardId;
    card.ownerSeat = seat;
    card.playableFromHand = true;
    card.projectedPlayCost = 2;
    state.players[seat]!.hand.push(card);
  }
  state.players[seat]!.handCount = cards.length;
  const opposing = new CardInstance();
  opposing.instanceId = `s${1 - seat}-22`;
  opposing.cardId = "BT21-019";
  opposing.ownerSeat = seat === 0 ? 1 : 0;
  state.players[1 - seat]!.hand.push(opposing);
  state.players[1 - seat]!.handCount = 1;
  const respond = vi.fn<(response: DecisionResponse) => void>();
  const acknowledge = vi.fn<() => void>();
  const view = (decision: DecisionRequest | undefined, status: "connected" | "reconnecting" = "connected") => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status,
          state,
          events: [],
          batches: [],
          decision,
          acknowledgeDecision: acknowledge,
          respondDecision: respond,
          error: undefined,
          sessionId: `session-${seat}`,
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view(initial));
  const physical = (id: string) => rendered.container.querySelector<HTMLElement>(`[data-hand-instance-id="${id}"]`)!;
  return {
    respond,
    acknowledge,
    physical,
    rerender: (decision: DecisionRequest | undefined, status?: "connected" | "reconnecting") =>
      rendered.rerender(view(decision, status)),
    restore: () => {
      window.matchMedia = originalMatchMedia;
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    },
  };
}

it.each(
  ([0, 1] as const).flatMap((seat) => [
    { seat, layout: "desktop", viewport: undefined },
    { seat, layout: "tablet", viewport: { name: "tablet", width: 1024, height: 768 } },
  ]),
)("#5331 seat $seat $layout clears prior P-103 picks and sends the own Delay instance", ({ seat, viewport }) => {
  const ids = [`s${seat}-22`, `s${seat}-20`];
  const request: DecisionRequest = {
    decisionId: "p103-main-search",
    seat,
    kind: "selectCards",
    sourceCardId: "P-103",
    promptText: "Offense Training",
    options: {
      candidateInstanceIds: ids,
      visibleInstanceIds: ids,
      visibleCards: ids.map((instanceId) => ({ instanceId, cardId: "BT1-016" })),
      min: 1,
      max: 1,
    },
  };
  const game = renderDecision(request, viewport, seat, [
    [ids[0]!, "BT1-016"],
    [ids[1]!, "BT1-016"],
    ["illegal", "BT1-021"],
  ]);
  try {
    fireEvent.click(game.physical(ids[0]!));
    expect(game.physical(ids[0]!).getAttribute("aria-pressed")).toBe("true");
    // A new server request must discard a previous pick even if its instance remains eligible.
    game.rerender({ ...request, decisionId: "p103-delay-destination" });
    expect(game.physical(ids[0]!).getAttribute("aria-pressed")).toBe("false");
    expect(game.respond).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement).disabled).toBe(true);
    expect(game.physical(`s${1 - seat}-22`)).toBeNull();
    expect(game.physical("illegal").getAttribute("aria-disabled")).toBe("true");
    const chosen = game.physical(ids[1]!);
    if (viewport) {
      fireEvent.pointerDown(chosen, { pointerId: 4, pointerType: "touch", clientX: 80, clientY: 80 });
      fireEvent.pointerUp(chosen, { pointerId: 4, pointerType: "touch", clientX: 80, clientY: 80 });
      fireEvent.click(chosen, { detail: 1 });
    } else fireEvent.click(chosen);
    expect(chosen.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "End Selection" }));
    expect(game.respond).toHaveBeenCalledExactlyOnceWith({ kind: "selectCards", instanceIds: [ids[1]] });
  } finally {
    game.restore();
  }
});
