// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { SpectatorPanel } from "./SpectatorPanel";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
it("opens a shared spectator link and enters by code without selecting a deck", () => {
  window.history.replaceState(null, "", "/play?watch=abcdef");
  const onWatch = vi.fn();
  render(
    <I18nProvider>
      <SpectatorPanel onWatch={onWatch} />
    </I18nProvider>,
  );
  expect((screen.getByRole("textbox", { name: "Match code" }) as HTMLInputElement).value).toBe("ABCDEF");
  fireEvent.click(screen.getByRole("button", { name: /^Watch$/ }));
  expect(onWatch).toHaveBeenCalledWith("ABCDEF");
});
it("keeps incomplete codes from entering a room", () => {
  const onWatch = vi.fn();
  render(
    <I18nProvider>
      <SpectatorPanel onWatch={onWatch} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Watch a match" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Match code" }), { target: { value: "abc" } });
  expect((screen.getByRole("button", { name: /^Watch$/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(onWatch).not.toHaveBeenCalled();
});
