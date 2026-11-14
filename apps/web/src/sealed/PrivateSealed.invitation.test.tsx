import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrivateSealed } from "@/sealed/PrivateSealed";
import { I18nProvider } from "@/i18n/I18nProvider";

vi.mock("@/game/GameScreen", () => ({ GameScreen: () => null }));
vi.mock("@/sealed/SealedPoolBuilder", () => ({ SealedPoolBuilder: () => null }));

const incoming = "0123456789ABCDEF01";
const entered = "ABCDEF012345678901";
const storageKey = "aegis:private-sealed-code";

function renderRoom() {
  return render(
    <I18nProvider>
      <PrivateSealed displayName="Host" onClose={() => undefined} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/play");
});

it.each(["join", "create"])(
  "reconciles invite A after successful %s of B and resumes B on reload and Back",
  async (action) => {
    window.history.replaceState({ navigation: "kept" }, "", `/play?privateSealed=${incoming}&other=kept#anchor`);
    const fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: entered,
            players: ["Host"],
            status: "building",
            score: [0, 0],
            winner: null,
            gameNumber: 1,
            pool: { packs: [] },
          }),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    let current = renderRoom();
    if (action === "join") {
      fireEvent.change(screen.getByRole("textbox", { name: "Join code" }), { target: { value: entered } });
      fireEvent.click(screen.getByRole("button", { name: "Join" }));
    } else {
      fireEvent.click(screen.getByRole("tab", { name: "Create" }));
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
    }
    await screen.findByText(/waiting for the second player/i);
    expect(new URLSearchParams(location.search).get("privateSealed")).toBe(entered);
    expect(new URLSearchParams(location.search).get("other")).toBe("kept");
    expect(location.hash).toBe("#anchor");
    expect(history.state).toEqual({ navigation: "kept" });
    for (let resume = 0; resume < 2; resume++) {
      if (resume === 1) {
        fireEvent.click(screen.getByRole("button", { name: "Back to Play" }));
      }
      current.unmount();
      current = renderRoom();
      await screen.findByText(/waiting for the second player/i);
      expect(sessionStorage.getItem(storageKey)).toBe(entered);
    }
    await waitFor(() => expect(fetch.mock.calls.filter((call) => call[1].method === "POST")).toHaveLength(1));
    expect(
      fetch.mock.calls.filter((call) => call[1].method === "GET").every((call) => call[0].endsWith(`/${entered}`)),
    ).toBe(true);
  },
);

it("honors a genuinely new incoming invitation instead of the previously saved room", () => {
  sessionStorage.setItem(storageKey, entered);
  window.history.replaceState(null, "", `/play?privateSealed=${incoming}`);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  renderRoom();
  expect(screen.getByRole("textbox", { name: "Join code" })).toHaveProperty("value", incoming);
  expect(screen.getByRole("button", { name: "Join" })).toHaveProperty("disabled", false);
  expect(fetch).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).toBe(entered);
});
