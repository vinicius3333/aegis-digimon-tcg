import { CardInstance, GameState, Permanent, Phase, PlayerState, type ServerEvent } from "@aegis/shared";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { snapshotGameState } from "@/net/presentedState";
import { singleServerBatch } from "@/net/serverBatches";
import { GameScreen } from "@/game/GameScreen";
import { MatchLogDisplay } from "@/game/log/MatchLogDisplay";
import { matchLogDisplayPreference } from "@/game/log/matchLogDisplayPreference";
import { NARROW_LAYOUT_QUERY } from "@/game/screen/queries";

function stubViewport(phone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: phone && query === NARROW_LAYOUT_QUERY,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function boardWithOpponentDigimon() {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 1;
  state.turnCount = 3;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = seat === 0 ? "You" : "Rival";
    player.deckCount = 30;
    player.securityCount = 5;
    state.players.push(player);
  }
  const digimon = new Permanent();
  digimon.permanentId = "rival-digimon";
  digimon.controllerSeat = 1;
  digimon.topCard = new CardInstance();
  digimon.topCard.instanceId = "rival-digimon-card";
  digimon.topCard.cardId = "ST12-15";
  digimon.stack.push(digimon.topCard);
  state.players[1]!.battleArea.push(digimon);
  return state;
}

function renderOpponentEffect() {
  const state = boardWithOpponentDigimon();
  const snapshots = [{ stateVersion: 1, state: snapshotGameState(state) }];
  const triggered: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "ST12-15",
    sourceInstanceId: "rival-digimon-card",
    sourcePermanentId: "rival-digimon",
    effectKey: "st12-15-main",
    timing: "Main",
    description: "[Main] Reveal the top 3 cards of your deck.",
  };
  const batches: ReturnType<typeof singleServerBatch>[] = [];
  const view = () => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => undefined}
        presentationPacing="sequential"
        demoConnection={{
          room: undefined,
          status: "connected",
          error: undefined,
          state,
          events: batches.flatMap((batch) => batch.events),
          batches: [...batches],
          snapshots: [...snapshots],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view());
  state.stateVersion = 2;
  snapshots.push({ stateVersion: 2, state: snapshotGameState(state) });
  batches.push(singleServerBatch([triggered], 2));
  rendered.rerender(view());
}

function effectNotice() {
  return document.querySelector(".game-board-notices :is(.match-notice, .narration-peek)");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each([
  { viewport: "desktop", phone: false, logAccess: "fixed-match-log" },
  { viewport: "phone", phone: true, logAccess: "log-strip" },
])("log popups on $viewport", ({ phone, logAccess }) => {
  it("stay hidden with the default setting and leave the match log reachable", async () => {
    stubViewport(phone);
    act(() => matchLogDisplayPreference.set(MatchLogDisplay.PANEL.value));
    renderOpponentEffect();
    expect(await screen.findByTestId(logAccess)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(effectNotice()).toBeNull();
  });

  it("show the effect once the player turns them on", async () => {
    stubViewport(phone);
    act(() => matchLogDisplayPreference.set(MatchLogDisplay.POPUPS.value));
    renderOpponentEffect();
    await waitFor(() => expect(effectNotice()).not.toBeNull(), { timeout: 5_000 });
  });
});
