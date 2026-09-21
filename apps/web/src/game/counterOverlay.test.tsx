// @vitest-environment jsdom
import { CardInstance, CombatWindow, GameState, PlayerState, Permanent, Phase } from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState, type ComponentProps } from "react";
import { I18nProvider } from "../i18n";
import { instanceCardId } from "./decisionModel";
import { CounterOverlay, counterTargetIds } from "./overlay/combat/CounterOverlay";
import { BlockOverlay } from "./overlay/combat/BlockOverlay";
import { EvoCostChoiceOverlay } from "./overlay/choice/EvoCostChoiceOverlay";
import { Hand } from "./piece/Hand";
import { PermanentView } from "./piece/PermanentView";
import { GameScreen } from "./GameScreen";
import type { AegisRoom } from "../net/client";

function CounterHandHarness(
  props: Omit<ComponentProps<typeof CounterOverlay>, "selectedInstanceId" | "onSelectInstance" | "handInstanceIds"> & {
    handCards?: { instanceId: string; cardId: string }[];
    fieldCards?: { permanentId: string; cardId: string; suspended?: boolean; dp?: number }[];
  },
) {
  const [selectedInstanceId, onSelectInstance] = useState<string>();
  const [selectedTargetPermanentId, selectTarget] = useState<string>();
  const {
    handCards = [
      { instanceId: "ace", cardId: "EX10-023" },
      { instanceId: "ineligible", cardId: "ST1-03" },
    ],
    fieldCards = [
      { permanentId: "one", cardId: "ST1-07" },
      { permanentId: "two", cardId: "ST1-09" },
      { permanentId: "yuuko", cardId: "BT22-083" },
    ],
    ...overlayProps
  } = props;
  return (
    <>
      <Hand
        cards={handCards.map((card) => ({
          ...card,
          activatableEffectsJson: "[]",
          playableFromHand: false,
          projectedPlayCost: -1,
          digivolveTargetPermanentIds: [],
          linkTargetPermanentIds: [],
        }))}
        startDrag={() => undefined}
        selection={{
          selectableInstanceIds: props.eligibleCounters.map((choice) => choice.instanceId),
          pickedInstanceIds: selectedInstanceId ? [selectedInstanceId] : [],
          onToggle: onSelectInstance,
        }}
      />
      <div role="group" aria-label="Your battle area">
        {fieldCards.map((card) => {
          const permanent = new Permanent();
          permanent.permanentId = card.permanentId;
          permanent.topCard = new CardInstance();
          permanent.topCard.instanceId = `${card.permanentId}-top`;
          permanent.topCard.cardId = card.cardId;
          permanent.isSuspended = card.suspended ?? false;
          permanent.baseDP = permanent.currentDP = card.dp ?? 5000;
          const routes = props.eligibleCounters.filter(
            (choice) =>
              choice.instanceId === selectedInstanceId &&
              counterTargetIds(choice.effectKey)?.permanentId === card.permanentId,
          );
          return (
            <PermanentView
              key={card.permanentId}
              perm={permanent}
              candidate={routes.length > 0}
              drop={{ "data-testid": `field-${card.permanentId}` }}
              onClick={() => {
                if (routes.length === 1) props.onActivate(routes[0]!.instanceId, routes[0]!.effectKey);
                else if (routes.length > 1) selectTarget(card.permanentId);
              }}
            />
          );
        })}
      </div>
      <CounterOverlay
        {...overlayProps}
        selectedInstanceId={selectedInstanceId}
        selectedTargetPermanentId={selectedTargetPermanentId}
        onSelectInstance={onSelectInstance}
        handInstanceIds={handCards.map((card) => card.instanceId)}
      />
    </>
  );
}

function chooseHandAce() {
  fireEvent.click(within(screen.getByTestId("hand")).getByRole("button", { name: /Quartzmon/ }));
}

afterEach(cleanup);

function renderAllianceGame() {
  localStorage.clear();
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    state.players.push(player);
  }
  for (const [permanentId, cardId] of [
    ["attacker", "ST1-07"],
    ["ally", "ST1-09"],
    ["ineligible", "BT1-024"],
  ]) {
    const permanent = new Permanent();
    permanent.permanentId = permanentId!;
    permanent.controllerSeat = 0;
    permanent.topCard = new CardInstance();
    permanent.topCard.instanceId = `${permanentId}-top`;
    permanent.topCard.cardId = cardId!;
    permanent.baseDP = permanent.currentDP = 6000;
    state.players[0]!.battleArea.push(permanent);
  }
  state.combatWindow = new CombatWindow();
  state.combatWindow.kind = "alliance";
  state.combatWindow.seat = 0;
  state.combatWindow.permanentId = "attacker";
  state.combatWindow.eligiblePermanentIds.push("ally");
  const send = vi.fn<(type: string, payload: unknown) => void>();
  const room = { connection: { isOpen: true }, send } as unknown as AegisRoom;
  const view = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room,
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
  const permanent = (id: string) =>
    view.container.querySelector<HTMLElement>(`[data-drop="perm-you"][data-id="${id}"]`)!;
  return { send, permanent };
}

it("selects an eligible Alliance Digimon directly on the real field", () => {
  const { send, permanent } = renderAllianceGame();

  expect(screen.queryByRole("dialog", { name: "Alliance window" })).toBeNull();
  expect(permanent("ally").classList.contains("game-permanent--candidate")).toBe(true);
  expect(permanent("ineligible").classList.contains("game-permanent--candidate")).toBe(false);
  fireEvent.click(permanent("ineligible"));
  expect(send).not.toHaveBeenCalled();
  fireEvent.keyDown(permanent("ally"), { key: "Enter" });
  expect(send).not.toHaveBeenCalled();
  const confirmation = screen.getByRole("dialog", { name: "Confirm Alliance" });
  expect(confirmation).toBeTruthy();
  expect(confirmation.querySelector(".action-confirmation__copy")).toBeNull();
  expect(confirmation.querySelector("img")).toBeNull();
  const confirm = screen.getByRole("button", { name: "Use Alliance" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(send).toHaveBeenCalledWith("respondAlliance", { allyPermanentId: "ally" });
  expect(send).toHaveBeenCalledTimes(1);
});

it("returns to Alliance field selection when confirmation is cancelled", () => {
  const { send, permanent } = renderAllianceGame();

  fireEvent.click(permanent("ally"));
  expect(screen.getByRole("dialog", { name: "Confirm Alliance" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Confirm Alliance" })).toBeNull();
  expect(screen.getByRole("region", { name: "Alliance window" })).toBeTruthy();
  expect(permanent("ally").classList.contains("game-permanent--candidate")).toBe(true);
  expect(send).not.toHaveBeenCalled();
});

it("passes Alliance from the field prompt without choosing a Digimon", () => {
  const { send } = renderAllianceGame();

  fireEvent.click(screen.getByRole("button", { name: "Pass" }));
  expect(send).toHaveBeenCalledWith("respondAlliance", { allyPermanentId: undefined });
});

it("routes real GameScreen hand and field clicks to the exact Counter intent without a modal", () => {
  localStorage.clear();
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 1;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    state.players.push(player);
  }
  for (const [instanceId, cardId] of [
    ["ace", "EX10-010"],
    ["other", "ST1-03"],
  ]) {
    const card = new CardInstance();
    card.instanceId = instanceId!;
    card.cardId = cardId!;
    card.ownerSeat = 0;
    state.players[0]!.hand.push(card);
  }
  state.players[0]!.handCount = 2;
  for (const [permanentId, cardId] of [
    ["base", "BT1-024"],
    ["yuuko", "BT22-083"],
  ]) {
    const permanent = new Permanent();
    permanent.permanentId = permanentId!;
    permanent.controllerSeat = 0;
    permanent.topCard = new CardInstance();
    permanent.topCard.instanceId = `${permanentId}-top`;
    permanent.topCard.cardId = cardId!;
    state.players[0]!.battleArea.push(permanent);
  }
  state.combatWindow = new CombatWindow();
  state.combatWindow.kind = "counter";
  state.combatWindow.seat = 0;
  state.combatWindow.attackerPermanentId = "attacker";
  state.combatWindow.eligibleCountersJson = JSON.stringify([
    { instanceId: "ace", effectKey: "blast-digivolve:base", description: "Blast Digivolve" },
  ]);
  const send = vi.fn<(type: string, payload: unknown) => void>();
  const room = { connection: { isOpen: true }, send } as unknown as AegisRoom;
  const view = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room,
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
  expect(screen.queryByRole("dialog")).toBeNull();
  const hand = within(screen.getByTestId("hand"));
  expect(hand.getByRole("button", { name: "Pick Agumon" }).getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(hand.getByRole("button", { name: "Pick BlackWarGreymon" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(send).not.toHaveBeenCalled();
  const base = view.container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="base"]')!;
  const yuuko = view.container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="yuuko"]')!;
  expect(base.classList.contains("game-permanent--candidate")).toBe(true);
  expect(yuuko.classList.contains("game-permanent--candidate")).toBe(false);
  fireEvent.click(base);
  expect(send).toHaveBeenCalledWith("respondCounter", { sourceInstanceId: "ace", effectKey: "blast-digivolve:base" });
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("returns focus from board inspection to the unanswered evolution-cost choice", () => {
  const confirm = vi.fn<() => void>();
  const cancel = vi.fn<() => void>();
  render(
    <I18nProvider>
      <EvoCostChoiceOverlay
        evolvingCardId="ST1-07"
        baseName="Agumon"
        options={[]}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "View board" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Return to decision" }));
  fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
  expect(document.activeElement).toBe(screen.getByRole("dialog"));
  expect(confirm).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
});
it("shows blocker artwork and statistics, and preserves mandatory blocking", () => {
  const block = vi.fn<(permanentId: string) => void>();
  const decline = vi.fn<() => void>();
  const props = {
    attackerCardId: "ST1-03",
    blockers: [{ permanentId: "blocker", cardId: "ST1-07", currentDP: 6000, sourceCount: 2 }],
    onBlock: block,
    onDecline: decline,
  };
  const view = render(
    <I18nProvider>
      <BlockOverlay {...props} />
    </I18nProvider>,
  );
  expect(screen.queryByText(/is attacking/)).toBeNull();
  expect(screen.getAllByRole("img")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /6,000 DP/ }));
  expect(block).toHaveBeenCalledWith("blocker");
  const buttons = screen.getAllByRole("button");
  fireEvent.click(buttons[1]!);
  expect(decline).toHaveBeenCalledOnce();
  view.rerender(
    <I18nProvider>
      <BlockOverlay {...props} mustBlock />
    </I18nProvider>,
  );
  expect(screen.getAllByRole("button")).toHaveLength(2);
  block.mockClear();
  decline.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "View board" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
  expect(screen.getByRole("dialog", { name: "Block window" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Take the attack/ })).toBeNull();
  expect(block).not.toHaveBeenCalled();
  expect(decline).not.toHaveBeenCalled();
});
it("selects a legal Counter from the actual hand before choosing its target, and disables other cards", () => {
  const state = new GameState();
  const player = new PlayerState();
  const card = new CardInstance();
  card.instanceId = "ace";
  card.cardId = "EX10-023";
  player.hand.push(card);
  state.players.push(player);
  expect(instanceCardId(state, "ace")).toBe("EX10-023");
  const onActivate = vi.fn<(instanceId: string, effectKey: string) => void>();
  const onPass = vi.fn<() => void>();
  render(
    <I18nProvider>
      <CounterHandHarness
        attackerCardId="ST1-03"
        handCards={[
          { instanceId: "ace", cardId: "EX10-023" },
          { instanceId: "other-ace", cardId: "ST1-09" },
          { instanceId: "ineligible", cardId: "ST1-03" },
        ]}
        eligibleCounters={[
          { instanceId: "ace", effectKey: "blast-digivolve:one", description: "Blast Digivolve" },
          { instanceId: "ace", effectKey: "blast-digivolve:two", description: "Blast Digivolve" },
          { instanceId: "other-ace", effectKey: "blast-digivolve:one", description: "Blast Digivolve" },
        ]}
        getCardId={(id) => (id === "other-ace" ? "ST1-09" : instanceCardId(state, id))}
        getPermanentCardId={(id) => (id === "one" ? "ST1-07" : "ST1-09")}
        onActivate={onActivate}
        onPass={onPass}
      />
    </I18nProvider>,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region")).toBeTruthy();
  const rail = within(screen.getByRole("region"));
  expect(rail.getByRole("img", { name: "Agumon" })).toBeTruthy();
  const hand = within(screen.getByTestId("hand"));
  const ineligible = hand.getByRole("button", { name: /Agumon/ });
  expect(ineligible.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(ineligible);
  expect(screen.queryByRole("dialog")).toBeNull();
  const ace = hand.getByRole("button", { name: /Quartzmon/ });
  expect(ace.classList.contains("game-hand-card--pickable")).toBe(true);
  chooseHandAce();
  expect(onActivate).not.toHaveBeenCalled();
  expect(rail.getByRole("img", { name: "Quartzmon" })).toBeTruthy();
  expect(rail.getByText("Quartzmon · Blast Digivolve")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("field-two").classList.contains("game-permanent--candidate")).toBe(true);
  expect(screen.getByTestId("field-yuuko").classList.contains("game-permanent--candidate")).toBe(false);
  fireEvent.click(screen.getByTestId("field-yuuko"));
  expect(onActivate).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Change card/ })).toBeNull();
  fireEvent.click(hand.getByRole("button", { name: /MetalGreymon/ }));
  expect(rail.getByRole("img", { name: "MetalGreymon" })).toBeTruthy();
  expect(rail.getByText("MetalGreymon · Blast Digivolve")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region")).toBeTruthy();
  expect(ace.getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByTestId("field-one").classList.contains("game-permanent--candidate")).toBe(true);
  expect(screen.getByTestId("field-two").classList.contains("game-permanent--candidate")).toBe(false);
  fireEvent.click(screen.getByTestId("field-two"));
  expect(onActivate).not.toHaveBeenCalled();
  chooseHandAce();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByTestId("field-two"));
  expect(onActivate).toHaveBeenCalledWith("ace", "blast-digivolve:two");
  fireEvent.click(screen.getByRole("button", { name: /Pass/ }));
  expect(onPass).toHaveBeenCalledOnce();
});

it("keeps distinct non-Blast counter effects reachable", () => {
  const activate = vi.fn<(instanceId: string, effectKey: string) => void>();
  render(
    <I18nProvider>
      <CounterHandHarness
        handCards={[]}
        eligibleCounters={[
          { instanceId: "source", effectKey: "first", description: "First counter" },
          { instanceId: "source", effectKey: "second", description: "Second counter" },
        ]}
        getCardId={() => "ST1-03"}
        getPermanentCardId={() => undefined}
        onActivate={activate}
        onPass={() => undefined}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /First counter/ }));
  expect(activate).toHaveBeenCalledWith("source", "first");
  fireEvent.click(screen.getByRole("button", { name: /Second counter/ }));
  expect(activate).toHaveBeenCalledWith("source", "second");
});

it("distinguishes identical Blast hosts and preserves each exact target", () => {
  const activate = vi.fn<(instanceId: string, effectKey: string) => void>();
  render(
    <I18nProvider>
      <CounterHandHarness
        eligibleCounters={[
          { instanceId: "ace", effectKey: "blast-digivolve:ready", description: "Blast Digivolve" },
          { instanceId: "ace", effectKey: "blast-digivolve:resting", description: "Blast Digivolve" },
        ]}
        getCardId={() => "EX10-023"}
        getPermanentCardId={() => "ST1-07"}
        fieldCards={[
          { permanentId: "ready", cardId: "ST1-07", dp: 5000 },
          { permanentId: "resting", cardId: "ST1-07", dp: 7000, suspended: true },
        ]}
        onActivate={activate}
        onPass={() => undefined}
      />
    </I18nProvider>,
  );
  chooseHandAce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(activate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("field-resting"));
  expect(activate).toHaveBeenCalledWith("ace", "blast-digivolve:resting");
  fireEvent.click(screen.getByTestId("field-ready"));
  expect(activate).toHaveBeenLastCalledWith("ace", "blast-digivolve:ready");
});
