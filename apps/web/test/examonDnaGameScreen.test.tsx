// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { intents } from "../src/net/intents";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import "@aegis-api/cards/BT20/BT20-045.js";
import "@aegis-api/cards/EX13/EX13-041.js";
import "@aegis-api/cards/EX13/EX13-021.js";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { tap } from "./scenarioHarness/tap";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "examon-ui-room", onMessage: () => () => {} },
  dnaDigivolve: vi.fn<typeof intents.dnaDigivolve>(),
  digivolve: vi.fn<typeof intents.digivolve>(),
}));
vi.mock("../src/net/useRoom", () => ({ useRoom: () => mocked.roomResult.current }));
vi.mock("../src/net/intents", () => ({
  intents: { dnaDigivolve: mocked.dnaDigivolve, digivolve: mocked.digivolve },
}));
afterEach(() => {
  cleanup();
  mocked.dnaDigivolve.mockReset();
  mocked.digivolve.mockReset();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "#5254 lets the hand preview start DNA with EX13 Lv.5 materials (mobile=%s)",
  async (mobile) => {
    if (mobile)
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
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX13-041", as: "groundramon" },
          { card: "EX13-021", as: "wingdramon" },
        ],
        hand: [{ card: "BT20-045", as: "examon" }],
        deck: ["BT1-010"],
        security: 5,
      },
      1: { deck: ["BT1-029"], security: 5 },
    });
    s.state.players[0]!.sessionId = "viewer-session";
    s.state.players[1]!.sessionId = "opponent-session";
    s.state.turnSeat = 0;
    s.state.phase = "Main";
    await s.ready();
    expect(s.inst("examon").digivolveTargetPermanentIds).toHaveLength(0);
    expect(s.inst("examon").dnaDigivolveRoutes).toHaveLength(1);
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
        identityColor="Green"
        startMode="casual"
        onExit={() => {}}
      />,
    );
    tap(within(screen.getByTestId("hand")).getByRole("img", { name: /^Examon$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Digivolve$/i }));
    const ground = screen.getByRole("img", { name: /^Groundramon$/i }).closest('[data-drop="perm-you"]')!;
    tap(ground);
    const wing = screen.getByRole("img", { name: /^Wingdramon$/i }).closest('[data-drop="perm-you"]')!;
    tap(wing);
    fireEvent.click(await screen.findByRole("button", { name: /^DNA digivolve$/i }));
    expect(mocked.dnaDigivolve).toHaveBeenCalledWith(
      mocked.room,
      [s.perm("groundramon").permanentId, s.perm("wingdramon").permanentId],
      s.inst("examon").instanceId,
    );
    expect(mocked.digivolve).not.toHaveBeenCalled();
  },
  20_000,
);
