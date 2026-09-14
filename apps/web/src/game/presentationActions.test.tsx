// @vitest-environment jsdom
import { CardInstance, GameState, Phase, PlayerState, Permanent, type DecisionRequest } from "@aegis/shared";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { setActionConfirmationsEnabled } from "../design/actionConfirmation";
import { I18nProvider } from "../i18n";
import type { AegisRoom } from "../net/client";
import { GameScreen } from "./GameScreen";

const cueFns = vi.hoisted(() => ({
  advance: vi.fn<() => boolean>(() => false),
  skip: vi.fn<() => void>(),
  phaseTransitionPending: false,
}));
vi.mock("./useMatchCues", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useMatchCues")>();
  return {
    ...actual,
    useMatchCues: (...args: Parameters<typeof actual.useMatchCues>) => ({
      ...actual.useMatchCues(...args),
      securityRevealPending: true,
      narrationLock: true,
      phaseTransitionPending: cueFns.phaseTransitionPending,
      decisionBarrierPending: true,
      advanceNarration: cueFns.advance,
      skipAnimations: cueFns.skip,
    }),
  };
});

afterEach(() => {
  cleanup();
  setActionConfirmationsEnabled(true);
  cueFns.advance.mockClear();
  cueFns.skip.mockClear();
  cueFns.phaseTransitionPending = false;
});

function mount(phase: Phase, decision?: DecisionRequest, withBreedingBase = false) {
  const state = new GameState();
  state.phase = phase;
  state.turnSeat = 0;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    state.players.push(player);
  }
  const card = new CardInstance();
  card.instanceId = "hand-card";
  card.cardId = "ST1-07";
  card.ownerSeat = 0;
  card.playableFromHand = true;
  if (withBreedingBase) card.digivolveTargetPermanentIds.push("breeding");
  state.players[0]!.hand.push(card);
  state.players[0]!.handCount = 1;
  if (phase === Phase.Breeding) {
    const egg = new CardInstance();
    egg.instanceId = "egg";
    egg.cardId = "ST1-01";
    egg.ownerSeat = 0;
    state.players[0]!.eggDeck.push(egg);
    state.players[0]!.eggDeckCount = 1;
  }
  if (withBreedingBase) {
    const base = new Permanent();
    base.permanentId = "breeding";
    base.controllerSeat = 0;
    base.inBreeding = true;
    const baseCard = new CardInstance();
    baseCard.instanceId = "base-card";
    baseCard.cardId = "ST1-03";
    baseCard.ownerSeat = 0;
    base.topCard = baseCard;
    state.players[0]!.breeding = base;
  }
  const send = vi.fn<(type: string, payload: unknown) => void>();
  const room = { connection: { isOpen: true }, send } as unknown as AegisRoom;
  const view = (nextDecision = decision) => (
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
          decision: nextDecision,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view());
  return {
    send,
    update(nextPhase: Phase, nextDecision?: DecisionRequest) {
      state.phase = nextPhase;
      rendered.rerender(view(nextDecision));
    },
  };
}

it("plays during active presentation cues in Main", () => {
  setActionConfirmationsEnabled(false);
  const { send } = mount(Phase.Main);
  const hand = screen.getByTestId("hand").querySelector<HTMLElement>(".game-hand-card")!;
  fireEvent.click(hand);
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Greymon" })).getByRole("button", { name: "Play Digimon" }),
  );
  expect(send).toHaveBeenCalledWith("playCard", expect.objectContaining({ instanceId: "hand-card" }));
  expect(cueFns.advance).not.toHaveBeenCalled();
  expect(cueFns.skip).not.toHaveBeenCalled();
});

it("allows breeding hatch and end phase while presentation cues are active", () => {
  const { send } = mount(Phase.Breeding);
  fireEvent.click(document.querySelector(".game-egg-deck--hatchable")!);
  expect(send).toHaveBeenCalledWith("hatchEgg", {});
  fireEvent.click(screen.getByRole("button", { name: /end breeding|end phase/i }));
  expect(send).toHaveBeenCalledWith("endPhase", {});
});

it("blocks hatching and ending breeding until the turn and phase banners finish", () => {
  cueFns.phaseTransitionPending = true;
  const { send, update } = mount(Phase.Breeding);
  const eggDeck = document.querySelector(".game-utility-slot--you-eggs")!;
  fireEvent.click(eggDeck);
  expect(document.querySelector(".game-egg-deck--hatchable")).toBeNull();
  const endPhase = screen.getByRole("button", { name: /end breeding|end phase/i });
  expect(endPhase.hasAttribute("disabled")).toBe(true);
  fireEvent.click(endPhase);
  expect(send).not.toHaveBeenCalled();

  cueFns.phaseTransitionPending = false;
  update(Phase.Breeding);
  fireEvent.click(document.querySelector(".game-egg-deck--hatchable")!);
  expect(send).toHaveBeenCalledWith("hatchEgg", {});
});

it("blocks Main actions while earlier phase banners are still presenting", () => {
  setActionConfirmationsEnabled(false);
  cueFns.phaseTransitionPending = true;
  const { send } = mount(Phase.Main);
  const hand = screen.getByTestId("hand").querySelector<HTMLElement>(".game-hand-card")!;
  fireEvent.click(hand);
  fireEvent.click(screen.getByRole("button", { name: "Play Digimon" }));
  expect(send).not.toHaveBeenCalled();
});

it("allows a Main phase digivolution onto the raising area while cues are active", () => {
  const { send } = mount(Phase.Main, undefined, true);
  const hand = screen.getByTestId("hand").querySelector<HTMLElement>(".game-hand-card")!;
  fireEvent.click(hand);
  fireEvent.click(screen.getByRole("button", { name: /glowing Digimon/i }));
  const slot = document.querySelector<HTMLElement>('[data-drop="breeding-you"]')!;
  fireEvent.click(slot);
  expect(send).toHaveBeenCalledWith(
    "digivolve",
    expect.objectContaining({ permanentId: "breeding", instanceId: "hand-card" }),
  );
});

it("does not send a normal action while an authoritative decision is pending", () => {
  setActionConfirmationsEnabled(false);
  const decision: DecisionRequest = {
    decisionId: "decision-1",
    seat: 0,
    kind: "optional",
    promptText: "Use effect",
    options: {},
  };
  const { send } = mount(Phase.Main, decision);
  const hand = screen.getByTestId("hand").querySelector<HTMLElement>(".game-hand-card")!;
  fireEvent.click(hand);
  expect(screen.queryByRole("button", { name: "Play Digimon" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /close/i }));
  expect(screen.getByRole("button", { name: /end phase/i }).hasAttribute("disabled")).toBe(true);
  expect(send).not.toHaveBeenCalledWith("playCard", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: /activate/i }));
  expect(send).toHaveBeenCalledWith("respondDecision", expect.objectContaining({ decisionId: "decision-1" }));
});

it.each([Phase.Active, Phase.Draw, Phase.End])("does not offer endPhase during %s", (phase) => {
  const { send } = mount(phase);
  const control = screen.getByRole("button", { name: "Resolving phase" });
  expect(control.hasAttribute("disabled")).toBe(true);
  fireEvent.click(control);
  expect(send).not.toHaveBeenCalled();
});

it("discards a digivolution confirmation when the server leaves Main", async () => {
  const { send, update } = mount(Phase.Main, undefined, true);
  const target = document.querySelector<HTMLElement>('[data-drop="breeding-you"]')!;
  target.getBoundingClientRect = () =>
    ({
      left: 40,
      right: 180,
      top: 160,
      bottom: 360,
      width: 140,
      height: 200,
      x: 40,
      y: 160,
      toJSON: () => ({}),
    }) as DOMRect;
  const source = screen.getByTestId("hand").querySelector<HTMLElement>(".game-hand-card")!;
  await act(async () => {
    source.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        clientY: 650,
        pointerId: 12,
        pointerType: "touch",
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 260,
        pointerId: 12,
        pointerType: "touch",
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, clientX: 100, clientY: 260, pointerId: 12, pointerType: "touch" }),
    );
  });
  expect(screen.getByRole("button", { name: /^digivolve$/i })).toBeDefined();
  update(Phase.Breeding);
  expect(screen.queryByRole("button", { name: /^digivolve$/i })).toBeNull();
  expect(send).not.toHaveBeenCalled();
});
