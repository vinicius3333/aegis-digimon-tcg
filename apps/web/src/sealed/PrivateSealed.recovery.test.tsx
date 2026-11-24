import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrivateSealed } from "@/sealed/PrivateSealed";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { PrivateSealedGameTicket, PrivateSealedReady } from "@aegis/shared/sealed/private/PrivateSealedContracts";

vi.mock("@/game/GameScreen", () => ({ GameScreen: () => null }));
vi.mock("@/sealed/SealedPoolBuilder", () => ({
  SealedPoolBuilder: ({
    readyDeck,
    onReady,
  }: {
    readyDeck: (input: PrivateSealedReady) => Promise<{ ok: boolean }>;
    onReady: () => void;
  }) => (
    <button
      onClick={async () => {
        const result = await readyDeck({ revision: 0, window: "initial", mainDeck: [], eggDeck: [] });
        if (result.ok) {
          onReady();
        }
      }}
    >
      Submit test deck
    </button>
  ),
}));

const code = "0123456789ABCDEF01";
const storageKey = "aegis:private-sealed-code";

function renderRoom(onStartGame?: (ticket: PrivateSealedGameTicket) => void) {
  return render(
    <I18nProvider>
      <PrivateSealed displayName="Host" onClose={() => undefined} onStartGame={onStartGame} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/play");
});

it.each([
  [404, "series_not_found"],
  [409, "series_not_found"],
  [403, "seat_required"],
])("locally forgets a saved room after HTTP %s %s and restores usable Create and Join", async (status, error) => {
  sessionStorage.setItem(storageKey, code);
  window.history.replaceState(null, "", `/play?privateSealed=${code}&other=kept`);
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error }), { status }));
  vi.stubGlobal("fetch", fetch);
  renderRoom();
  await screen.findByRole("alert");
  expect(sessionStorage.getItem(storageKey)).toBe(code);
  fireEvent.click(screen.getByRole("button", { name: "Forget saved room" }));
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(new URLSearchParams(location.search).has("privateSealed")).toBe(false);
  expect(new URLSearchParams(location.search).get("other")).toBe("kept");
  fireEvent.click(screen.getByRole("tab", { name: "Create" }));
  expect(screen.getByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
  fireEvent.click(screen.getByRole("tab", { name: "Join" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Join code" }), { target: { value: code } });
  expect(screen.getByRole("button", { name: "Join" })).toHaveProperty("disabled", false);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
});

it("preserves the saved invitation through a transient lookup error and Back", async () => {
  sessionStorage.setItem(storageKey, code);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  renderRoom();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
  expect(sessionStorage.getItem(storageKey)).toBe(code);
});

it("preserves an in-flight invitation across Back and resumes the valid room without creating", async () => {
  sessionStorage.setItem(storageKey, code);
  let resolve: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  const fetch = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code,
            players: ["Host"],
            status: "building",
            score: [0, 0],
            gameNumber: 1,
            pool: { packs: [] },
          }),
        ),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const first = renderRoom();
  fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
  first.unmount();
  expect(sessionStorage.getItem(storageKey)).toBe(code);
  await act(async () => resolve(new Response(JSON.stringify({ error: "seat_required" }), { status: 403 })));
  renderRoom();
  await screen.findByText(/waiting for the second player/i);
  expect(sessionStorage.getItem(storageKey)).toBe(code);
  expect(fetch.mock.calls.every((call) => call[1].method === "GET")).toBe(true);
});

it.each(["success", "error", "pending"])(
  "ignores a deferred poll %s after Forget without unmounting",
  async (outcome) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    sessionStorage.setItem(storageKey, code);
    window.history.replaceState(null, "", `/play?privateSealed=${code}`);
    let resolve: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((done) => {
      resolve = done;
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "series_not_found" }), { status: 404 }))
      .mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", fetch);
    const mounted = renderRoom();
    await screen.findByRole("button", { name: "Forget saved room" });
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Forget saved room" }));
    await act(async () =>
      resolve(
        outcome === "success"
          ? new Response(
              JSON.stringify({
                code,
                players: ["Host"],
                status: "building",
                score: [0, 0],
                gameNumber: 1,
                pool: { packs: [] },
              }),
            )
          : new Response(JSON.stringify({ error: outcome === "pending" ? "result_pending" : "private_sealed_error" }), {
              status: outcome === "pending" ? 409 : 500,
            }),
      ),
    );
    expect(mounted.container.querySelectorAll(".private-sealed__actions button")).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Saving the authoritative game result/)).toBeNull();
    expect(screen.getByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
    expect(new URLSearchParams(location.search).has("privateSealed")).toBe(false);
    expect(fetch.mock.calls.every((call) => call[1].method === "GET")).toBe(true);
  },
);

it("does not restore a deferred Create response after Back without unmounting", async () => {
  let resolve: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  const fetch = vi.fn().mockReturnValueOnce(pending);
  vi.stubGlobal("fetch", fetch);
  const mounted = renderRoom();
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
  await act(async () =>
    resolve(
      new Response(
        JSON.stringify({
          code,
          players: ["Host"],
          status: "building",
          score: [0, 0],
          gameNumber: 1,
          pool: { packs: [] },
        }),
      ),
    ),
  );
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(new URLSearchParams(location.search).has("privateSealed")).toBe(false);
  expect(mounted.container.querySelectorAll(".private-sealed__actions button")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
});

it("preserves the saved invitation on Back without starting a deferred game", async () => {
  sessionStorage.setItem(storageKey, code);
  window.history.replaceState(null, "", `/play?privateSealed=${code}`);
  let resolve: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code,
            players: ["Host", "Guest"],
            status: "building",
            score: [0, 0],
            gameNumber: 1,
            pool: { packs: [] },
          }),
        ),
      )
      .mockReturnValueOnce(pending),
  );
  const started = vi.fn();
  renderRoom(started);
  fireEvent.click(await screen.findByRole("button", { name: /Start next game/ }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
  await act(async () => resolve(new Response(JSON.stringify({ code, gameId: "old-game", roomId: "old-room" }))));
  expect(started).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).toBe(code);
  expect(new URLSearchParams(location.search).get("privateSealed")).toBe(code);
});

it.each([
  ["cancel", "success"],
  ["cancel", "error"],
  ["cancel", "pending"],
  ["start", "success"],
  ["start", "error"],
  ["start", "pending"],
  ["ready", "success"],
  ["ready", "error"],
  ["ready", "pending"],
])("ignores a deferred %s %s after Forget without unmounting", async (action, outcome) => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  sessionStorage.setItem(storageKey, code);
  window.history.replaceState(null, "", `/play?privateSealed=${code}`);
  const view = {
    code,
    players: ["Host", "Guest"],
    status: "building",
    score: [0, 0],
    gameNumber: 1,
    pool: { packs: [] },
  };
  let resolve: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(view)))
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "seat_required" }), { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  const started = vi.fn();
  const mounted = renderRoom(started);
  const name = action === "cancel" ? /cancel/i : action === "start" ? /start/i : /Submit test deck/;
  fireEvent.click(await screen.findByRole("button", { name }));
  expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  fireEvent.click(await screen.findByRole("button", { name: "Forget saved room" }));
  expect(screen.getByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
  await act(async () =>
    resolve(
      outcome === "success"
        ? new Response(JSON.stringify(action === "start" ? { code, gameId: "old-game", roomId: "old-room" } : view))
        : new Response(JSON.stringify({ error: outcome === "pending" ? "result_pending" : "private_sealed_error" }), {
            status: outcome === "pending" ? 409 : 500,
          }),
    ),
  );
  expect(started).not.toHaveBeenCalled();
  expect(mounted.container.querySelectorAll(".private-sealed__actions button")).toHaveLength(1);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText(/Saving the authoritative game result/)).toBeNull();
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(new URLSearchParams(location.search).has("privateSealed")).toBe(false);
});

it.each(["series_not_found", "result_pending"])(
  "keeps an old Ready continuation inert after Forget with fourth GET 409 %s",
  async (error) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    sessionStorage.setItem(storageKey, code);
    const view = {
      code,
      players: ["Host", "Guest"],
      status: "building",
      score: [0, 0],
      gameNumber: 1,
      pool: { packs: [] },
    };
    let resolveReady!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(view)))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveReady = resolve;
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "series_not_found" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error }), { status: 409 }));
    vi.stubGlobal("fetch", fetch);
    renderRoom();
    fireEvent.click(await screen.findByRole("button", { name: "Submit test deck" }));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    fireEvent.click(await screen.findByRole("button", { name: "Forget saved room" }));
    await act(async () => resolveReady(new Response(JSON.stringify(view))));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Saving the authoritative game result/)).toBeNull();
    expect(screen.getByRole("button", { name: "Create" })).toHaveProperty("disabled", false);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  },
);

it.each(["series_not_found", "result_pending", "success"])(
  "keeps room B fetch and view owned when old Ready resumes with old GET %s",
  async (outcome) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    sessionStorage.setItem(storageKey, code);
    const view = {
      code,
      players: ["Host", "Guest"],
      status: "building",
      score: [0, 0],
      gameNumber: 1,
      pool: { packs: [] },
    };
    const nextCode = "ABCDEF0123456789AB";
    const nextView = { ...view, code: nextCode, players: ["New host", "New guest"] };
    let resolveReady!: (response: Response) => void;
    let resolveNext!: (response: Response) => void;
    let nextSignal!: AbortSignal;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(view)))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveReady = resolve;
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "series_not_found" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(nextView)))
      .mockImplementationOnce((_url, init) => {
        nextSignal = init.signal;
        return new Promise<Response>((resolve) => {
          resolveNext = resolve;
        });
      })
      .mockResolvedValueOnce(
        outcome === "success"
          ? new Response(JSON.stringify(view))
          : new Response(JSON.stringify({ error: outcome }), { status: 409 }),
      );
    vi.stubGlobal("fetch", fetch);
    renderRoom();
    fireEvent.click(await screen.findByRole("button", { name: "Submit test deck" }));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    fireEvent.click(await screen.findByRole("button", { name: "Forget saved room" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByText(/New host/);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
    await act(async () => resolveReady(new Response(JSON.stringify(view))));
    expect(nextSignal.aborted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(5);
    await act(async () => resolveNext(new Response(JSON.stringify(nextView))));
    expect(screen.getByText(/New host/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Saving the authoritative game result/)).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBe(nextCode);
    expect(new URLSearchParams(location.search).get("privateSealed")).toBe(nextCode);
  },
);
