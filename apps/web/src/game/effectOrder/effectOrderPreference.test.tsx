// @vitest-environment jsdom
import { CardInstance, GameState, Permanent, Phase, PlayerState } from "@aegis/shared";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreen } from "@/game/GameScreen";
import { setEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/setEffectOrderEnabled";
import type { EffectOrderRulesFile, RulingsSetFile } from "@/game/rulings/RulingsFiles";
import { I18nProvider } from "@/i18n/I18nProvider";

const loaders = vi.hoisted(() => ({
  loadCardRulings: vi.fn<(cardId: string) => Promise<RulingsSetFile | undefined>>(),
  loadEffectOrderRules: vi.fn<() => Promise<EffectOrderRulesFile | undefined>>(),
}));

vi.mock("@/game/rulings/loadCardRulings", () => ({ loadCardRulings: loaders.loadCardRulings }));
vi.mock("@/game/rulings/loadEffectOrderRules", () => ({ loadEffectOrderRules: loaders.loadEffectOrderRules }));
vi.mock("@/game/screen/hooks/useNothingToDoPrompts", () => ({ useNothingToDoPrompts: () => undefined }));

const derivedTriggering = {
  section: "15-4-5",
  title: "Derived Triggering",
  sourceTitle: "Comprehensive Rules",
  text: "Derived effects resolve before pending effects.",
};

const queue: EffectQueueEntry[] = [
  { seat: 0, position: 1, isResolving: true, sourceCardId: "BT3-092", sourcePermanentId: "malo", timing: "OnDeletion" },
  { seat: 1, position: 2, sourceZone: "hand" },
];

function matchState(): GameState {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.turnCount = 3;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    state.players.push(player);
  }
  const malo = new Permanent();
  malo.permanentId = "malo";
  malo.controllerSeat = 0;
  malo.topCard = new CardInstance();
  malo.topCard.cardId = "BT3-092";
  malo.topCard.instanceId = "malo-card";
  malo.topCard.faceUp = true;
  state.players[0]!.battleArea.push(malo);
  state.effectQueueJson = JSON.stringify(queue);
  return state;
}

async function renderMatch() {
  const state = matchState();
  const result = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Purple"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result.container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="malo"]')!;
}

async function inspect(permanent: HTMLElement): Promise<HTMLElement> {
  fireEvent.contextMenu(permanent);
  const inspector = await screen.findByRole("dialog", { name: /MaloMyotismon/ });
  await act(async () => {
    await Promise.resolve();
  });
  return inspector;
}

describe("effect order and rulings preference", () => {
  beforeEach(() => {
    localStorage.clear();
    loaders.loadCardRulings.mockResolvedValue({
      sections: { "15-4-5": derivedTriggering },
      cards: { "BT3-092": { qa: [{ id: "Q1105", date: null, question: "Does it trigger?", answer: "Yes." }] } },
    });
    loaders.loadEffectOrderRules.mockResolvedValue({
      effectOrderSections: ["15-4-5"],
      sections: { "15-4-5": derivedTriggering },
    });
  });

  afterEach(() => {
    cleanup();
    setEffectOrderEnabled(false);
    vi.clearAllMocks();
  });

  it("shows no panel, badges, or rulings and fetches no rulings while the option is off", async () => {
    const permanent = await renderMatch();

    expect(screen.queryByTestId("effect-order-panel")).toBeNull();
    expect(within(permanent).queryByTestId("effect-order-badges")).toBeNull();
    const inspector = await inspect(permanent);
    expect(within(inspector).queryByTestId("card-rulings")).toBeNull();
    expect(loaders.loadCardRulings).not.toHaveBeenCalled();
    expect(loaders.loadEffectOrderRules).not.toHaveBeenCalled();
  });

  it("shows the panel, the badges, and the card's rulings once the player turns the option on", async () => {
    setEffectOrderEnabled(true);
    const permanent = await renderMatch();

    const panel = screen.getByTestId("effect-order-panel");
    expect(within(panel).getByRole("listitem", { name: "Resolving now, step 1" })).toBeTruthy();
    expect(within(panel).getByRole("listitem", { name: "Resolves at step 2" })).toBeTruthy();
    expect(within(permanent).getByTestId("effect-order-badges").textContent).toBe("1Now");
    expect(within(panel).getByText(/15-4-5 · Derived Triggering/)).toBeTruthy();
    const inspector = await inspect(permanent);
    const rulings = within(inspector).getByTestId("card-rulings");
    expect(rulings.querySelector("[data-question-id='Q1105']")).not.toBeNull();
    expect(loaders.loadCardRulings).toHaveBeenCalledWith("BT3-092");
  });
});
