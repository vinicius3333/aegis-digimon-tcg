// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { accountApi } from "../account/client";
import { Login } from "./Login";

afterEach(() => cleanup());

describe("the sign-in screen", () => {
  it("sends the player to the Discord authorization endpoint", () => {
    const assigned: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return assigned[assigned.length - 1] ?? "";
        },
        set href(value: string) {
          assigned.push(value);
        },
      },
    });

    render(
      <I18nProvider>
        <Login onBack={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with Discord" }));

    expect(assigned).toEqual([`${accountApi.base}/auth/discord`]);
    expect(screen.getByText("Opening Discord…")).toBeTruthy();
  });

  it("keeps playing without an account one click away", () => {
    const onBack = vi.fn<() => void>();
    render(
      <I18nProvider>
        <Login onBack={onBack} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
