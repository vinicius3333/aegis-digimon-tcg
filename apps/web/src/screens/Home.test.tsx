// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Home } from "./Home";

function renderHome(overrides: Partial<Parameters<typeof Home>[0]> = {}) {
  const props = {
    collectionSize: 4388,
    signedIn: false,
    onPlay: vi.fn<() => void>(),
    onBuildDeck: vi.fn<() => void>(),
    onSignIn: vi.fn<() => void>(),
    onReportBug: vi.fn<() => void>(),
    ...overrides,
  };
  render(
    <I18nProvider>
      <Home {...props} />
    </I18nProvider>,
  );
  return props;
}

afterEach(() => cleanup());

describe("the home screen", () => {
  it("leads with the two things a visitor can do first", () => {
    const props = renderHome();

    expect(screen.getByRole("heading", { name: "Build a deck and play live. Free." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play now" }));
    fireEvent.click(screen.getByRole("button", { name: "Build a deck" }));

    expect(props.onPlay).toHaveBeenCalled();
    expect(props.onBuildDeck).toHaveBeenCalled();
  });

  it("names the collection size the pitch is promising", () => {
    renderHome({ collectionSize: 4388 });
    expect(screen.getByText(/4,388 card collection/)).toBeTruthy();
  });

  it("nudges a guest to connect an account", () => {
    const props = renderHome({ signedIn: false });
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(props.onSignIn).toHaveBeenCalled();
  });

  it("drops the nudge once the player is signed in", () => {
    renderHome({ signedIn: true });
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
  });

  it("reports a bug from the footer", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    expect(props.onReportBug).toHaveBeenCalled();
  });
});
