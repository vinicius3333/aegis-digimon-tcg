import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BotOpponentPreview } from "@/bot/personas/BotOpponentPreview";
import { PlayerLine } from "@/game/screen/layout/PlayerLine";
import { FAMOUS_DECKS } from "@/game/decks";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

describe("bot character presentation", () => {
  it("keeps the character, bot label and selected deck visible together", () => {
    const deck = FAMOUS_DECKS.find((entry) => entry.id.includes("ulforce"))!;
    render(
      <I18nProvider>
        <BotOpponentPreview deck={deck} />
      </I18nProvider>,
    );
    expect(screen.getByText("Rina Shinomiya")).toBeTruthy();
    expect(screen.getByText(deck.name)).toBeTruthy();
    expect(screen.getByText("Bot")).toBeTruthy();
  });

  it("shows a neutral identity for random and unmatched custom decks", () => {
    const view = render(
      <I18nProvider>
        <BotOpponentPreview />
      </I18nProvider>,
    );
    expect(screen.getByText("Aegis")).toBeTruthy();
    view.rerender(
      <I18nProvider>
        <BotOpponentPreview
          deck={{ id: "custom", name: "My Ulforce", color: "Blue", blurb: "", mainDeck: ["BT11-112"], eggDeck: [] }}
        />
      </I18nProvider>,
    );
    expect(screen.getByText("Aegis")).toBeTruthy();
    expect(screen.getByText("My Ulforce")).toBeTruthy();
  });

  it("renders the synchronized character in the game without changing the server name", () => {
    const view = render(
      <I18nProvider>
        <PlayerLine name="Rina · Bot 2" botPersonaId="rina-shinomiya" side="opponent" />
      </I18nProvider>,
    );
    expect(screen.getByText("Rina · Bot 2")).toBeTruthy();
    expect(screen.getByText("Bot")).toBeTruthy();
    const portrait = view.container.querySelector("img")!;
    expect(portrait.getAttribute("src")).toContain("BT11-112");
    expect(portrait.getAttribute("alt")).toBe("");
    expect(view.container.querySelector(".bot-portrait")?.getAttribute("data-size")).toBe("18");
  });

  it("falls back through card sources to initials when every image fails", () => {
    const view = render(
      <I18nProvider>
        <PlayerLine name="Rina Shinomiya" botPersonaId="rina-shinomiya" side="opponent" />
      </I18nProvider>,
    );
    for (let attempt = 0; attempt < 10 && view.container.querySelector("img"); attempt++) {
      fireEvent.error(view.container.querySelector("img")!);
    }
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.querySelector(".bot-portrait")?.textContent).toBe("RS");
  });

  it("keeps human avatars free of bot identity and recovers from an unknown persona", () => {
    const view = render(
      <I18nProvider>
        <PlayerLine name="Player" avatarId="greymon" side="player" />
      </I18nProvider>,
    );
    expect(screen.queryByText("Bot")).toBeNull();
    expect(view.container.querySelector("img")?.getAttribute("src")).toContain("greymon");
    view.rerender(
      <I18nProvider>
        <PlayerLine name="Unknown bot" botPersonaId="missing" side="opponent" />
      </I18nProvider>,
    );
    expect(screen.getByText("Unknown bot")).toBeTruthy();
    expect(screen.getByText("Bot")).toBeTruthy();
    expect(view.container.querySelector(".bot-portrait")).toBeNull();
  });
});
