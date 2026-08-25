// @vitest-environment jsdom

/* The memory gauge's cost preview, end to end: the board is arranged by the engine, a
   hand card is dragged over an area WITHOUT being released, and the gauge is read back.
   What the preview prices must be the action that release would actually take — a play
   over the battle area, the digivolution onto a base over that base — which is why these
   assertions read the marker's position rather than the module's return value. */

import { afterEach, expect, it, vi } from "vitest";
import { setupEngine, type EngineSetup } from "@aegis-api/engine/testkit/harness.js";
import { act, cleanup, render, screen, within } from "./scenarioHarness/testingLibrary";
import { memoryCellCenterFraction, predictedMemory } from "../src/game/memoryArc";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "memory-preview-room" },
  digivolve: vi.fn(),
  dnaDigivolve: vi.fn(),
  playCard: vi.fn(),
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

vi.mock("../src/net/intents", () => ({
  intents: { digivolve: mocked.digivolve, dnaDigivolve: mocked.dnaDigivolve, playCard: mocked.playCard },
}));

afterEach(() => {
  cleanup();
  mocked.digivolve.mockReset();
  mocked.dnaDigivolve.mockReset();
  mocked.playCard.mockReset();
});

async function mountGame(s: EngineSetup, identityColor: "Red" | "Yellow" | "Black" = "Red") {
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Main";
  await s.ready();
  mocked.roomResult.current = {
    room: mocked.room,
    status: "connected",
    state: s.state,
    events: [],
    decision: undefined,
    error: undefined,
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };

  const { GameScreen } = await import("../src/game/GameScreen");
  render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor={identityColor}
      startMode="casual"
      onExit={() => {}}
    />,
  );
}

function placeDropZone(target: HTMLElement): void {
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
      toJSON: () => {},
    }) as DOMRect;
}

/** Pick the card up and hold it over the drop zone; the drop is never released. */
async function holdOver(source: Element, pointerId: number): Promise<void> {
  await act(async () => {
    source.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 650, pointerId, pointerType: "mouse" }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 260,
        pointerId,
        pointerType: "mouse",
      }),
    );
  });
}

function previewMarker(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".game-memory-prediction__marker");
}

/** The memory value the marker sits on, read back out of its inline position. */
function previewedMemory(): number | undefined {
  const marker = previewMarker();
  if (!marker) return undefined;
  for (let value = 10; value >= -10; value -= 1) {
    if (marker.style.left.includes(`${memoryCellCenterFraction(value)}`)) return value;
  }
  throw new Error(`preview marker at an unrecognised position: ${marker.style.left}`);
}

it("previews nothing while no card is held", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT1-010", as: "agumon" }], deck: ["BT1-010"], security: 5 },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  expect(previewMarker()).toBeNull();
});

it("previews the play cost while a playable hand card is dragged over the battle area", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT1-010", as: "agumon" }], deck: ["BT1-010"], security: 5 },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  const agumon = within(screen.getByTestId("hand")).getByRole("img", { name: /^agumon$/i });
  const target = document.querySelector('[data-drop="battle-you"]') as HTMLElement;
  placeDropZone(target);
  await holdOver(agumon, 21);

  const playCost = s.inst("agumon").projectedPlayCost;
  expect(playCost).toBeGreaterThanOrEqual(0);
  expect(previewedMemory()).toBe(predictedMemory(s.state.memory, playCost));
});

it("previews the digivolution cost, not the play cost, over a base the card may digivolve onto", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "ST12-06", as: "baoHuckmon" }],
      hand: [{ card: "ST12-08", as: "saviorHuckmon" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /^saviorhuckmon$/i });
  const base = screen.getByRole("img", { name: /^baohuckmon$/i });
  const target = base.closest('[data-drop="perm-you"]') as HTMLElement;
  placeDropZone(target);
  await holdOver(source, 22);

  const { getCardDefinition } = await import("@aegis/shared");
  const evolving = getCardDefinition("ST12-08")!;
  const baseDefinition = getCardDefinition("ST12-06")!;
  const digivolveCost = evolving.evoCosts.find(
    (evo) => evo.level === baseDefinition.level && baseDefinition.colors.includes(evo.color),
  )!.memoryCost;

  expect(digivolveCost).not.toBe(evolving.playCost);
  expect(previewedMemory()).toBe(predictedMemory(s.state.memory, digivolveCost));
});

it("previews nothing over the breeding area when the held card cannot digivolve there", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "ST12-06", as: "raisedBaoHuckmon" },
      hand: [{ card: "BT1-010", as: "agumon" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /^agumon$/i });
  const target = document.querySelector('[data-drop="breeding-you"]') as HTMLElement;
  placeDropZone(target);
  await holdOver(source, 23);

  expect(previewMarker()).toBeNull();
});

/* Digivolving in the breeding area pays the digivolution cost like any other
   digivolution (manual "Pay the digivolution cost"; the engine's applyDigivolve only
   skips INTERACTIVE reductions for a base `inBreeding`). Hatching is the free one, and
   it starts no drag, so it never reaches the preview at all. */
it("previews the breeding digivolution's own cost, which the memory gauge really spends", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "ST12-06", as: "raisedBaoHuckmon" },
      hand: [{ card: "ST12-08", as: "raisedSaviorHuckmon" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /^saviorhuckmon$/i });
  const target = document.querySelector('[data-drop="breeding-you"]') as HTMLElement;
  placeDropZone(target);
  await holdOver(source, 25);

  const { getCardDefinition } = await import("@aegis/shared");
  const evolving = getCardDefinition("ST12-08")!;
  const baseDefinition = getCardDefinition("ST12-06")!;
  const digivolveCost = evolving.evoCosts.find(
    (evo) => evo.level === baseDefinition.level && baseDefinition.colors.includes(evo.color),
  )!.memoryCost;

  expect(previewedMemory()).toBe(predictedMemory(s.state.memory, digivolveCost));
});

it("previews nothing over an area that would refuse the drop", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT1-010", as: "agumon" }], deck: ["BT1-010"], security: 5 },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s);

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /^agumon$/i });
  const target = document.querySelector('[data-drop="opp-security"]') as HTMLElement;
  placeDropZone(target);
  await holdOver(source, 24);

  expect(previewMarker()).toBeNull();
});
