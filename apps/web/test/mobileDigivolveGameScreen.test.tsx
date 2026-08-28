// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { setupEngine, type EngineSetup } from "@aegis-api/engine/testkit/harness.js";
import { act, cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "mobile-digivolve-ui-room" },
  digivolve: vi.fn(),
  dnaDigivolve: vi.fn(),
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

vi.mock("../src/net/intents", () => ({
  intents: { digivolve: mocked.digivolve, dnaDigivolve: mocked.dnaDigivolve },
}));

afterEach(() => {
  cleanup();
  mocked.digivolve.mockReset();
  mocked.dnaDigivolve.mockReset();
  vi.unstubAllGlobals();
});

function stubMobileViewport(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(width < 600px)" || query === "(width < 960px)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

async function mountGame(s: EngineSetup, identityColor: "Red" | "Yellow" | "Black" = "Red") {
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Main";
  // The board is arranged; recompute so the engine projects the affordances the UI
  // reads (CardInstance.digivolveTargetPermanentIds), as a played board would carry.
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

async function touchDrag(source: Element, pointerId: number): Promise<void> {
  await act(async () => {
    source.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        clientY: 650,
        pointerId,
        pointerType: "touch",
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 260,
        pointerId,
        pointerType: "touch",
      }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: 100,
        clientY: 260,
        pointerId,
        pointerType: "touch",
      }),
    );
  });
}

it("mobile touch-drag lets ST12-08 digivolve onto a red level 4 and asks for confirmation", async () => {
  stubMobileViewport();

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

  const saviorHuckmon = within(screen.getByTestId("hand")).getByRole("img", { name: /^saviorhuckmon$/i });
  const baoHuckmon = screen.getByRole("img", { name: /^baohuckmon$/i });
  const target = baoHuckmon.closest('[data-drop="perm-you"]') as HTMLElement;
  placeDropZone(target);
  await touchDrag(saviorHuckmon, 12);

  expect(await screen.findByText(/digivolve baohuckmon into saviorhuckmon/i)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /^digivolve$/i }));

  expect(mocked.digivolve).toHaveBeenCalledWith(
    mocked.room,
    s.perm("baoHuckmon").permanentId,
    s.inst("saviorHuckmon").instanceId,
  );
});

it("mobile touch-drag evolves ST12-08 in breeding through the same confirmation gate", async () => {
  stubMobileViewport();
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
  await touchDrag(source, 13);

  expect(await screen.findByText(/digivolve baohuckmon into saviorhuckmon/i)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /^digivolve$/i }));
  expect(mocked.digivolve).toHaveBeenCalledWith(
    mocked.room,
    s.state.players[0]!.breeding!.permanentId,
    s.inst("raisedSaviorHuckmon").instanceId,
  );
});

it("mobile touch-drag exposes both normal and DNA evolution for Ordinemon", async () => {
  stubMobileViewport();
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT8-082", as: "ophanimonA", under: ["ST10-04"] },
        { card: "BT8-082", as: "ophanimonB" },
      ],
      hand: [{ card: "BT9-082", as: "ordinemon" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s, "Yellow");

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /^ordinemon$/i });
  const [ophanimon] = screen.getAllByRole("img", { name: /^ophanimon falldown mode$/i });
  const target = ophanimon!.closest('[data-drop="perm-you"]') as HTMLElement;
  placeDropZone(target);
  await touchDrag(source, 14);

  expect(await screen.findByText(/dna digivolution available/i)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /^dna digivolve$/i }));
  expect(mocked.dnaDigivolve).toHaveBeenCalledWith(
    mocked.room,
    [s.perm("ophanimonA").permanentId, s.perm("ophanimonB").permanentId],
    s.inst("ordinemon").instanceId,
  );
});

it("mobile touch-drag offers both BT10-069 evolution costs instead of choosing silently", async () => {
  stubMobileViewport();
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT10-066", as: "darkKnightmon" }],
      hand: [{ card: "BT10-069", as: "darkKnightmonX" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  await mountGame(s, "Black");

  const source = within(screen.getByTestId("hand")).getByRole("img", { name: /darkknightmon \(x antibody\)/i });
  const base = screen.getByRole("img", { name: /^darkknightmon$/i });
  const target = base.closest('[data-drop="perm-you"]') as HTMLElement;
  placeDropZone(target);
  await touchDrag(source, 15);

  expect(await screen.findByText(/^digivolve cost$/i)).toBeDefined();
  expect(screen.getByRole("button", { name: /4 memory/i })).toBeDefined();
  expect(screen.getByRole("button", { name: /5 memory/i })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /4 memory/i }));
  expect(mocked.digivolve).toHaveBeenCalledWith(
    mocked.room,
    s.perm("darkKnightmon").permanentId,
    s.inst("darkKnightmonX").instanceId,
    true,
  );
});
