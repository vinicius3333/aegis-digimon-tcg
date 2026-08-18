// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { cleanup, render, screen, within } from "./scenarioHarness/testingLibrary";
import { dragOnto } from "./scenarioHarness/dragDrop";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "ordinemon-ui-room" },
  dnaDigivolve: vi.fn(),
  digivolve: vi.fn(),
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

vi.mock("../src/net/intents", () => ({
  intents: {
    dnaDigivolve: mocked.dnaDigivolve,
    digivolve: mocked.digivolve,
  },
}));

afterEach(() => {
  cleanup();
  mocked.dnaDigivolve.mockReset();
  mocked.digivolve.mockReset();
});

async function renderOrdinemonChoice() {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT8-082", as: "host", under: ["ST10-04"] },
        { card: "BT8-082", as: "partner" },
      ],
      hand: [{ card: "BT9-082", as: "ordinemon" }],
      deck: ["BT1-010"],
      security: 5,
    },
    1: { deck: ["BT1-029"], security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
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
      joinOptions={{
        displayName: "Protagonist",
        deck: { mainDeck: [], eggDeck: [] },
      }}
      identityColor="Yellow"
      startMode="casual"
      onExit={() => {}}
    />,
  );

  const ordinemon = within(screen.getByTestId("hand")).getByRole("img", { name: /^ordinemon$/i });
  const [ophanimon] = screen.getAllByRole("img", { name: /^ophanimon falldown mode$/i });
  const target = ophanimon!.closest('[data-drop="perm-you"]') as HTMLElement;
  dragOnto(ordinemon, target);

  const dialog = await screen.findByText(/dna digivolution available/i);
  const panel = dialog.closest(".game-modal__panel") as HTMLElement;
  return { s, panel };
}

it("dragging Ordinemon onto Ophanimon exposes DNA instead of silently choosing normal evolution", async () => {
  const { s, panel } = await renderOrdinemonChoice();
  expect(within(panel).getByRole("button", { name: /digivolve normally/i })).toBeTruthy();
  within(panel).getByRole("button", { name: /^dna digivolve$/i }).click();

  expect(mocked.dnaDigivolve).toHaveBeenCalledWith(
    mocked.room,
    [s.perm("host").permanentId, s.perm("partner").permanentId],
    s.inst("ordinemon").instanceId,
  );
  expect(mocked.digivolve).not.toHaveBeenCalled();
});

it("keeps Ordinemon's legal normal evolution available beside DNA", async () => {
  const { s, panel } = await renderOrdinemonChoice();
  within(panel).getByRole("button", { name: /digivolve normally/i }).click();

  expect(mocked.digivolve).toHaveBeenCalledWith(
    mocked.room,
    s.perm("host").permanentId,
    s.inst("ordinemon").instanceId,
    undefined,
  );
  expect(mocked.dnaDigivolve).not.toHaveBeenCalled();
});
