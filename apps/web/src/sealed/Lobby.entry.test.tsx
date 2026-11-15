import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Lobby } from "@/screens/Lobby";
import { I18nProvider } from "@/i18n/I18nProvider";
import { loadIdentity } from "@/identity";
import { requestPrivateSealed } from "@/sealed/requestPrivateSealed";
import "@/sealed/PrivateSealed";

vi.mock("@/game/GameScreen", () => ({ GameScreen: () => null }));
vi.mock("@/sealed/SealedPoolBuilder", () => ({ SealedPoolBuilder: () => null }));
vi.mock("@/sealed/requestPrivateSealed", () => ({ requestPrivateSealed: vi.fn<typeof requestPrivateSealed>() }));
vi.mock("@/net/client", () => ({
  liveMatches: async () => ({ matches: [], total: 0 }),
  matchQueueCounts: async () => ({ buckets: [], waiting: [] }),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/play");
});

it("opens private sealed without a saved deck and forwards the existing lobby identity", async () => {
  window.history.replaceState(null, "", "/play");
  const player = loadIdentity();
  const onStart = vi.fn<() => void>();
  vi.mocked(requestPrivateSealed).mockResolvedValue({ ok: false, error: { status: 0, code: "network_error" } });
  render(
    <I18nProvider>
      <Lobby
        player={player}
        decks={[]}
        activeDeckId=""
        onSelectDeck={() => undefined}
        onCopyDeck={() => undefined}
        onNav={() => undefined}
        onStart={onStart}
      />
    </I18nProvider>,
  );
  expect(document.querySelectorAll(".lobby-mode")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: /Private Match/ }));
  fireEvent.click(screen.getByText("Advanced settings"));
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "sealed" } });
  expect(screen.getByRole("combobox", { name: "Rules" })).toHaveProperty("value", "sealed");
  expect(screen.queryByRole("button", { name: "Enter queue" })).toBeNull();
  expect(screen.queryByText("Build a deck first")).toBeNull();
  expect(await screen.findByText("Booster series")).toBeTruthy();
  const create = await screen.findByRole("button", { name: "Create" });
  expect(create).toHaveProperty("disabled", false);
  expect(screen.queryByRole("textbox", { name: /player name/i })).toBeNull();
  fireEvent.click(create);
  await waitFor(() => expect(requestPrivateSealed).toHaveBeenCalledTimes(1));
  expect(requestPrivateSealed).toHaveBeenCalledWith({
    code: undefined,
    action: undefined,
    body: { name: player.name, requestId: expect.any(String), setId: expect.any(String) },
  });
  expect(onStart).not.toHaveBeenCalled();
});

function renderLobby() {
  render(
    <I18nProvider>
      <Lobby
        player={loadIdentity()}
        decks={[]}
        activeDeckId=""
        onSelectDeck={() => undefined}
        onCopyDeck={() => undefined}
        onNav={() => undefined}
        onStart={() => undefined}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Private Match/ }));
  fireEvent.click(screen.getByText("Advanced settings"));
}

it("leaves setup behind after creation so match controls do not crowd the pool builder", async () => {
  renderLobby();
  vi.mocked(requestPrivateSealed).mockResolvedValue({
    ok: true,
    value: {
      code: "0123456789ABCDEF01",
      seat: 0,
      players: [loadIdentity().name],
      status: "building",
      score: [0, 0],
      winner: null,
      reason: null,
      gameNumber: 1,
      serverNow: 0,
      pool: {
        window: "build",
        configuration: {
          setId: "BT26",
          packs: 6,
          collationVersion: "test",
          catalogVersion: "test",
          rulesVersion: "test",
          buildMinutes: 30,
          sideboardSeconds: 120,
        },
        packs: [],
        revision: 0,
        deck: null,
        ready: false,
        editable: true,
        deadlineAt: null,
      },
    },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "sealed" } });
  fireEvent.click(await screen.findByRole("button", { name: "Create" }));
  await screen.findByTestId("private-sealed-code");
  await waitFor(() => expect(document.querySelectorAll(".lobby-mode")).toHaveLength(0));
  expect(screen.queryByRole("combobox", { name: "Rules" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
  expect(document.querySelectorAll(".lobby-mode")).toHaveLength(3);
  expect(screen.getByRole("combobox", { name: "Rules" })).toHaveProperty("value", "standard");
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "sealed" } });
  await screen.findByTestId("private-sealed-code");
  await waitFor(() => expect(document.querySelectorAll(".lobby-mode")).toHaveLength(0));
});

it("uses the existing create and join tabs for sealed invitations without sending a constructed request", async () => {
  renderLobby();
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "sealed" } });
  fireEvent.click(await screen.findByRole("tab", { name: "Join" }));
  expect(screen.queryByRole("combobox", { name: "Booster series" })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Join code" }), { target: { value: "abcdef012345678901" } });
  vi.mocked(requestPrivateSealed).mockResolvedValue({ ok: false, error: { status: 0, code: "network_error" } });
  fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await waitFor(() =>
    expect(requestPrivateSealed).toHaveBeenCalledWith({
      code: "ABCDEF012345678901",
      action: "join",
      body: { name: loadIdentity().name, requestId: expect.any(String) },
    }),
  );
});

it("allows selecting sealed from the private join setup before entering an invitation", async () => {
  renderLobby();
  fireEvent.click(screen.getByRole("tab", { name: "Join" }));
  const rules = screen.getByRole("combobox", { name: "Rules" });
  expect(rules).toHaveProperty("disabled", false);
  fireEvent.change(rules, { target: { value: "sealed" } });
  expect((await screen.findByRole("tab", { name: "Join" })).getAttribute("aria-selected")).toBe("true");
});

it("preserves constructed rules and restricts sealed to private matches", async () => {
  renderLobby();
  expect(screen.getByRole("option", { name: "Sealed Format" })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "sealed" } });
  expect(await screen.findByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
  expect(screen.queryByRole("combobox", { name: "Card pool" })).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Rules" }), { target: { value: "pauper" } });
  expect(screen.getByRole("combobox", { name: "Rules" })).toHaveProperty("value", "pauper");
  expect(screen.queryByRole("combobox", { name: "Booster series" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Practice vs AI/ }));
  expect(screen.queryByRole("option", { name: "Sealed Format" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Rules" })).toHaveProperty("value", "pauper");
  expect(requestPrivateSealed).not.toHaveBeenCalled();
});
