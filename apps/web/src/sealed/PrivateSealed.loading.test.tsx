import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PrivateSealed } from "@/sealed/PrivateSealed";
import { I18nProvider } from "@/i18n/I18nProvider";

const gameRuntime = vi.hoisted(() => {
  let resolve: () => void = () => undefined;
  const ready = new Promise<void>((release) => {
    resolve = release;
  });
  return { ready, release: () => resolve() };
});

vi.mock("@/game/GameScreen", async () => {
  await gameRuntime.ready;
  return { GameScreen: () => null };
});
vi.mock("@/sealed/SealedPoolBuilder", () => ({ SealedPoolBuilder: () => null }));

afterEach(() => {
  gameRuntime.release();
  cleanup();
  sessionStorage.clear();
});

it("shows creator preparation while the arena runtime is still loading", async () => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/play");
  render(
    <I18nProvider>
      <PrivateSealed displayName="CobaltWarden" onClose={() => undefined} />
    </I18nProvider>,
  );
  expect(await screen.findByRole("combobox", { name: /^Booster series$/ })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: /^Player name$/ })).toBeNull();
  expect(screen.queryByLabelText(/^Player name$/)).toBeNull();
  expect(screen.getByRole("button", { name: "Create" })).toBeTruthy();
  expect(
    screen
      .getByText(/Aegis BO3 policy/i)
      .closest("details")
      ?.hasAttribute("open"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("tab", { name: "Join" }));
  expect(screen.getByRole("button", { name: "Join" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("textbox", { name: "Join code" })).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: /^Booster series$/ })).toBeNull();
});
