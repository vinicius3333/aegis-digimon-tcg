// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Phase,
  PlayerState,
  type DecisionRequest,
  type DecisionResponse,
} from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { GameScreen } from "./GameScreen";
import { matchesMediaQuery, PHONE_VIEWPORTS, type Viewport } from "./style/viewportCascade";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<(kind: string) => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

function handDecision(
  kind: "selectCards" | "chooseTargets" = "selectCards",
  options: DecisionRequest["options"] = {},
): DecisionRequest {
  return {
    decisionId: "hand-cost",
    seat: 0,
    kind,
    promptText: "Select cards from your hand.",
    options: { candidateInstanceIds: ["copy-first", "copy-second"], min: 1, max: 1, ...options },
  };
}

function renderDecision(initial = handDecision(), viewport?: Viewport) {
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
  state.turnSeat = 0;
  state.memory = 5;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    state.players.push(player);
  }
  for (const [instanceId, cardId] of [
    ["copy-first", "ST1-07"],
    ["copy-second", "ST1-07"],
    ["ineligible", "ST1-09"],
  ] as const) {
    const card = new CardInstance();
    card.instanceId = instanceId;
    card.cardId = cardId;
    card.playableFromHand = true;
    card.projectedPlayCost = 2;
    state.players[0]!.hand.push(card);
  }
  state.players[0]!.handCount = 3;
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
          sessionId: "session-0",
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

it.each(["selectCards", "chooseTargets"] as const)(
  "highlights physical hand copies and confirms the exact %s response",
  (kind) => {
    const game = renderDecision(handDecision(kind));
    try {
      const rail = screen.getByRole("region", { name: "Hand selection" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(rail.getAttribute("data-prompt-surface")).toBe("left");
      expect(game.physical("copy-first").classList.contains("game-hand-card--pickable")).toBe(true);
      expect(game.physical("copy-second").classList.contains("game-hand-card--pickable")).toBe(true);
      expect(game.physical("ineligible").classList.contains("game-hand-card--unpickable")).toBe(true);
      const confirm = within(rail).getByRole("button", { name: "End Selection" });
      expect((confirm as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(game.physical("ineligible"));
      expect((confirm as HTMLButtonElement).disabled).toBe(true);
      fireEvent.keyDown(game.physical("copy-second"), { key: "Enter" });
      expect(game.physical("copy-second").getAttribute("aria-pressed")).toBe("true");
      expect(game.physical("copy-first").getAttribute("aria-pressed")).toBe("false");
      fireEvent.click(confirm);
      expect(game.respond).toHaveBeenCalledExactlyOnceWith({ kind, instanceIds: ["copy-second"] });
    } finally {
      game.restore();
    }
  },
);

it("enforces min/max, supports deselection and replaces the oldest pick at the server's max", () => {
  const game = renderDecision(
    handDecision("selectCards", { candidateInstanceIds: ["copy-first", "copy-second", "ineligible"], min: 2, max: 2 }),
  );
  try {
    const confirm = screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement;
    fireEvent.click(game.physical("copy-first"));
    expect(confirm.disabled).toBe(true);
    fireEvent.click(game.physical("copy-second"));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(game.physical("copy-second"));
    expect(confirm.disabled).toBe(true);
    fireEvent.click(game.physical("copy-second"));
    fireEvent.click(game.physical("ineligible"));
    expect(game.physical("copy-first").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(confirm);
    expect(game.respond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["copy-second", "ineligible"] });
  } finally {
    game.restore();
  }
});

it("preserves play-cost budgets and lets a selected hand card be deselected", () => {
  const game = renderDecision(handDecision("selectCards", { min: 1, max: 2, maxTotalPlayCost: 6 }));
  try {
    fireEvent.click(game.physical("copy-first"));
    expect(game.physical("copy-second").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(game.physical("copy-second"));
    expect(game.physical("copy-second").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(game.physical("copy-first"));
    expect(game.physical("copy-second").getAttribute("aria-disabled")).toBeNull();
    fireEvent.click(game.physical("copy-second"));
    fireEvent.click(screen.getByRole("button", { name: "End Selection" }));
    expect(game.respond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["copy-second"] });
  } finally {
    game.restore();
  }
});

it("allows an optional hand cost to be declined without choosing a card", () => {
  const game = renderDecision(handDecision("chooseTargets", { min: 0, max: 1 }));
  try {
    fireEvent.click(screen.getByRole("button", { name: "No Selection" }));
    expect(game.respond).toHaveBeenCalledExactlyOnceWith({ kind: "chooseTargets", instanceIds: [] });
  } finally {
    game.restore();
  }
});

it("keeps duplicate hand copies distinct while enforcing distinct-card constraints", () => {
  const game = renderDecision(handDecision("selectCards", { min: 1, max: 2, distinctCardIds: true }));
  try {
    fireEvent.click(game.physical("copy-second"));
    expect(game.physical("copy-first").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(game.physical("copy-first"));
    expect(game.physical("copy-second").getAttribute("aria-pressed")).toBe("true");
    expect(game.physical("copy-first").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "End Selection" }));
    expect(game.respond).toHaveBeenCalledExactlyOnceWith({ kind: "selectCards", instanceIds: ["copy-second"] });
  } finally {
    game.restore();
  }
});

it("keeps a hand pick while inspecting the board and resets it for a new decision after reconnect", () => {
  const request = handDecision();
  const game = renderDecision(request);
  try {
    fireEvent.click(game.physical("copy-second"));
    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    const back = screen.getByRole("button", { name: "Return to decision" });
    expect(document.activeElement).toBe(back);
    fireEvent.click(back);
    expect(game.physical("copy-second").getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement).disabled).toBe(false);
    game.rerender(request, "reconnecting");
    expect(screen.queryByRole("button", { name: "End Selection" })).toBeNull();
    game.rerender({ ...request, decisionId: "next-hand-cost" });
    expect(game.physical("copy-second").getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement).disabled).toBe(true);
    expect(game.respond).not.toHaveBeenCalled();
  } finally {
    game.restore();
  }
});

it.each(PHONE_VIEWPORTS)(
  "picks through the touch hand strip at $name and keeps ineligible cards disabled",
  (viewport) => {
    const game = renderDecision(handDecision(), viewport);
    try {
      const target = game.physical("copy-second");
      fireEvent.pointerDown(target, { pointerId: 3, pointerType: "touch", clientX: 80, clientY: 80 });
      fireEvent.pointerUp(target, { pointerId: 3, pointerType: "touch", clientX: 80, clientY: 80 });
      fireEvent.click(target, { detail: 1 });
      expect(target.getAttribute("aria-pressed")).toBe("true");
      expect(game.physical("ineligible").getAttribute("aria-disabled")).toBe("true");
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "End Selection" }));
      expect(game.respond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["copy-second"] });
    } finally {
      game.restore();
    }
  },
);
