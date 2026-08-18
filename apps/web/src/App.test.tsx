// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AegisClient, cardEffectsLabCardId, withAccountAvatar } from "./App";
import { I18nProvider } from "./i18n";

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

describe("card effects demo route", () => {
  it("normalizes a card ID only from the direct demo path", () => {
    expect(cardEffectsLabCardId("/dev/card-effects/ex3-074")).toBe("EX3-074");
    expect(cardEffectsLabCardId("/dev/card-effects/EX3-074/")).toBe("EX3-074");
    expect(cardEffectsLabCardId("/collection/EX3-074")).toBeUndefined();
    expect(cardEffectsLabCardId("/dev/card-effects/")).toBeUndefined();
  });

  it("does not crash on a malformed encoded card ID", () => {
    expect(cardEffectsLabCardId("/dev/card-effects/%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("account avatar identity", () => {
  it("clears account-owned avatar data after logout", () => {
    const player = {
      name: "Tamer",
      color: "Blue",
      shards: 0,
      avatarId: "tyrannomon" as const,
      avatarUrl: "provider.png",
    };

    expect(withAccountAvatar(player, null)).toEqual({
      name: "Tamer",
      color: "Blue",
      shards: 0,
      avatarId: null,
      avatarUrl: null,
    });
  });
});

describe("responsive application state", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("aegis:player", JSON.stringify({ name: "Resize Tamer", color: "Blue", shards: 0 }));
    HTMLCanvasElement.prototype.getContext = () => null;
    setViewportWidth(1200);
  });

  afterEach(() => cleanup());

  it("shows a simple empty state when the player has no decks", async () => {
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Resize Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId=""
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
          initialScreen="deck"
        />
      </I18nProvider>,
    );

    expect(await screen.findByText("You don't have any decks yet.")).toBeTruthy();
  });

  it("does not present a famous preset as the player's active deck", async () => {
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Resize Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId="bt10-xros-heart"
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
          initialScreen="home"
        />
      </I18nProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "You haven't built a deck yet. Create one to start playing." }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Xros Heart" })).toBeNull();
  });

  it("preserves the active screen and form draft when the viewport crosses a breakpoint", async () => {
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Resize Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId=""
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
          initialScreen="settings"
        />
      </I18nProvider>,
    );

    await screen.findByRole("heading", { name: "Preferences" }, { timeout: 10_000 });
    const nameInput = screen.getByDisplayValue("Resize Tamer");
    fireEvent.change(nameInput, { target: { value: "Unsaved responsive draft" } });

    setViewportWidth(500);

    expect(await screen.findByRole("heading", { name: "Preferences" }, { timeout: 10_000 })).toBeTruthy();
    expect(screen.getByDisplayValue("Unsaved responsive draft")).toBeTruthy();
  }, 20_000);

  it("stores the action confirmation preference from settings", async () => {
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Resize Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId=""
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
          initialScreen="settings"
        />
      </I18nProvider>,
    );

    const confirmationSwitch = await screen.findByRole("switch", { name: /Confirm actions/ });
    expect(confirmationSwitch.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(confirmationSwitch);

    expect(confirmationSwitch.getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem("aegis.action-confirmation.enabled")).toBe("false");
  });

  it("updates the URL during navigation and follows browser history events", async () => {
    window.history.replaceState(null, "", "/settings");
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Resize Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId=""
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
        />
      </I18nProvider>,
    );

    await screen.findByRole("heading", { name: "Preferences" });
    fireEvent.click(screen.getAllByRole("button", { name: "Decks" })[0]!);
    expect(await screen.findByRole("heading", { name: "Your decks" })).toBeTruthy();
    expect(window.location.pathname).toBe("/decks");

    window.history.replaceState(null, "", "/settings");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByRole("heading", { name: "Preferences" })).toBeTruthy();
  });
});
