// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { EffectDuration, PendingDecision, Phase } from "@aegis/shared";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { dragOnto } from "./scenarioHarness/dragDrop";
import { GameScreen } from "../src/game/GameScreen";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "app-fusion-ui-room" },
  appFusion: vi.fn<typeof import("../src/net/intents").intents.appFusion>(),
  digivolve: vi.fn<typeof import("../src/net/intents").intents.digivolve>(),
}));

vi.mock("../src/net/useRoom", () => ({ useRoom: () => mocked.roomResult.current }));
vi.mock("../src/net/intents", () => ({ intents: { appFusion: mocked.appFusion, digivolve: mocked.digivolve } }));

afterEach(() => {
  cleanup();
  mocked.appFusion.mockReset();
  mocked.digivolve.mockReset();
});

async function renderFusionScenario() {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] },
        {
          card: "BT23-016",
          as: "hostTwo",
          linked: [
            { card: "BT23-039", as: "linkTwo" },
            { card: "BT23-039", as: "linkThree" },
          ],
        },
      ],
      hand: [{ card: "BT23-021", as: "result" }],
      deck: ["BT1-009", "BT1-010"],
      security: 3,
    },
    1: { deck: ["BT1-011", "BT1-012"], security: 3 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  await s.ready();
  (
    s.engine as unknown as {
      continuous: { addLinkMaxGrant(id: string, delta: number, duration: EffectDuration): void };
    }
  ).continuous.addLinkMaxGrant(s.perm("hostTwo").permanentId, 1, EffectDuration.UntilEachTurnEnd);
  await s.engine.recomputeContinuousEffects();
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
  const rendered = render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Yellow"
      startMode="casual"
      onExit={() => {}}
    />,
  );
  return { s, rerender: rendered.rerender };
}

it("opens App Fusion from hand selection on the second host and sends the second material", async () => {
  const { s } = await renderFusionScenario();
  const result = within(screen.getByTestId("hand")).getByRole("img", { name: /^dosukomon$/i });
  const handButton = result.closest('[role="button"]') as HTMLElement;
  const secondHost = screen
    .getAllByRole("img", { name: /^dokamon$/i })[1]!
    .closest('[data-drop="perm-you"]') as HTMLElement;
  fireEvent.keyDown(handButton, { key: "Enter" });
  secondHost.click();
  const dialog = await screen.findByText(/App Fusion/i);
  const panel = dialog.closest(".app-fusion-choice__panel") as HTMLElement;
  expect(within(panel).getAllByRole("radio")).toHaveLength(2);
  within(panel).getAllByRole("radio")[1]!.click();
  within(panel)
    .getByRole("button", { name: /app fuse/i })
    .click();
  expect(mocked.appFusion).toHaveBeenCalledWith(
    mocked.room,
    s.perm("hostTwo").permanentId,
    s.inst("result").instanceId,
    s.inst("linkThree").instanceId,
  );
  expect(mocked.digivolve).not.toHaveBeenCalled();
});

it("keeps the drag route and does not invent a normal fallback", async () => {
  await renderFusionScenario();
  const result = within(screen.getByTestId("hand")).getByRole("img", { name: /^dosukomon$/i });
  const secondHost = screen
    .getAllByRole("img", { name: /^dokamon$/i })[1]!
    .closest('[data-drop="perm-you"]') as HTMLElement;
  dragOnto(result, secondHost);
  const panel = (await screen.findByText(/App Fusion/i)).closest(".app-fusion-choice__panel") as HTMLElement;
  expect(within(panel).queryByRole("button", { name: /normal evolution/i })).toBeNull();
  expect(mocked.appFusion).not.toHaveBeenCalled();
});

it("cancels without sending an App Fusion intent", async () => {
  await renderFusionScenario();
  const result = within(screen.getByTestId("hand")).getByRole("img", { name: /^dosukomon$/i });
  const handButton = result.closest('[role="button"]') as HTMLElement;
  const secondHost = screen
    .getAllByRole("img", { name: /^dokamon$/i })[1]!
    .closest('[data-drop="perm-you"]') as HTMLElement;
  fireEvent.keyDown(handButton, { key: "Enter" });
  secondHost.click();
  const panel = (await screen.findByText(/App Fusion/i)).closest(".app-fusion-choice__panel") as HTMLElement;
  within(panel)
    .getByRole("button", { name: /cancel/i })
    .click();
  expect(mocked.appFusion).not.toHaveBeenCalled();
});

it("rejects a route after its selected host link is removed", async () => {
  const { s, rerender } = await renderFusionScenario();
  const result = within(screen.getByTestId("hand")).getByRole("img", { name: /^dosukomon$/i });
  const handButton = result.closest('[role="button"]') as HTMLElement;
  const secondHost = screen
    .getAllByRole("img", { name: /^dokamon$/i })[1]!
    .closest('[data-drop="perm-you"]') as HTMLElement;
  fireEvent.keyDown(handButton, { key: "Enter" });
  secondHost.click();
  await screen.findByText(/App Fusion/i);
  s.perm("hostTwo").linked = [s.perm("hostTwo").linked![1]!];
  mocked.roomResult.current = { ...(mocked.roomResult.current as object), state: s.state, stateVersion: 2 };
  rerender(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Yellow"
      startMode="casual"
      onExit={() => {}}
    />,
  );
  const currentPanel = screen.queryByText(/App Fusion/i)?.closest(".app-fusion-choice__panel") as HTMLElement | null;
  expect(currentPanel).toBeTruthy();
  const confirm = within(currentPanel!).getByRole("button", { name: /app fuse/i });
  expect((confirm as HTMLButtonElement).disabled).toBe(true);
  confirm.click();
  expect(mocked.appFusion).not.toHaveBeenCalled();
});

it.each([
  [
    "wrong turn",
    (s: Awaited<ReturnType<typeof renderFusionScenario>>["s"]) => {
      s.state.turnSeat = 1;
    },
  ],
  [
    "wrong phase",
    (s: Awaited<ReturnType<typeof renderFusionScenario>>["s"]) => {
      s.state.phase = Phase.Draw;
    },
  ],
  [
    "game over",
    (s: Awaited<ReturnType<typeof renderFusionScenario>>["s"]) => {
      s.state.gameOver = true;
    },
  ],
  [
    "pending decision",
    (s: Awaited<ReturnType<typeof renderFusionScenario>>["s"]) => {
      const pending = new PendingDecision();
      pending.decisionId = "ui-stale-decision";
      pending.seat = 0;
      pending.kind = "optional";
      pending.promptText = "Resolve the pending effect";
      s.state.pendingDecision = pending;
    },
  ],
  [
    "removed own host",
    (s: Awaited<ReturnType<typeof renderFusionScenario>>["s"]) => {
      s.state.players[0]!.battleArea = s.state.players[0]!.battleArea.filter(
        (p) => p.permanentId !== s.perm("hostTwo").permanentId,
      );
    },
  ],
] as const)("does not confirm App Fusion after %s", async (_label, mutate) => {
  const { s, rerender } = await renderFusionScenario();
  const result = within(screen.getByTestId("hand")).getByRole("img", { name: /^dosukomon$/i });
  const secondHost = screen
    .getAllByRole("img", { name: /^dokamon$/i })[1]!
    .closest('[data-drop="perm-you"]') as HTMLElement;
  dragOnto(result, secondHost);
  await screen.findByText(/App Fusion/i);
  mutate(s);
  mocked.roomResult.current = { ...(mocked.roomResult.current as object), state: s.state, stateVersion: 2 };
  rerender(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Yellow"
      startMode="casual"
      onExit={() => {}}
    />,
  );
  const confirm = screen.queryByRole("button", { name: /app fuse/i }) as HTMLButtonElement | null;
  expect(confirm === null || confirm.disabled).toBe(true);
  expect(screen.queryByRole("button", { name: /digivolve normally/i })).toBeNull();
  confirm?.click();
  expect(mocked.appFusion).not.toHaveBeenCalled();
  expect(mocked.digivolve).not.toHaveBeenCalled();
});
