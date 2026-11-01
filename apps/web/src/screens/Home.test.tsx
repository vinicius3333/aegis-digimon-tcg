// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckListing } from "@/game/decks";
import { HomeMatchQueue } from "@/home/HomeMatchQueue";
import { I18nProvider } from "@/i18n";
import { Home } from "@/screens/Home";

const deck: DeckListing = {
  id: "mine-1",
  name: "Imperialdramon",
  color: "Blue",
  blurb: "",
  mainDeck: Array.from({ length: 50 }, () => "BT1-010"),
  eggDeck: Array.from({ length: 5 }, () => "BT1-001"),
  updatedAt: 1,
};

function renderHome(overrides: Partial<Parameters<typeof Home>[0]> = {}) {
  const props: Parameters<typeof Home>[0] = {
    decks: [deck],
    activeDeck: deck,
    activeDeckId: deck.id,
    rankedEnabled: true,
    onFindMatch: vi.fn<(queue: HomeMatchQueue) => void>(),
    onPractice: vi.fn<() => void>(),
    onPrivateMatch: vi.fn<() => void>(),
    onChangeDeck: vi.fn<() => void>(),
    onWatchLive: vi.fn<(code: string) => void>(),
    onOpenWatch: vi.fn<() => void>(),
    onOpenTournament: vi.fn<(id: string) => void>(),
    onOpenTournaments: vi.fn<() => void>(),
    onCreateTournament: vi.fn<() => void>(),
    onOpenBooster: vi.fn<() => void>(),
    onEditDeck: vi.fn<(deck: DeckListing) => void>(),
    onPlayDeck: vi.fn<(deck: DeckListing) => void>(),
    onBuildDeck: vi.fn<() => void>(),
    onOpenDecks: vi.fn<() => void>(),
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

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ matches: [], total: 0 }), { status: 200 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the home screen", () => {
  it("renders live player portraits and public card previews without changing the watch action", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 1,
          matches: [
            {
              spectatorCode: "ABCDEF",
              players: ["Taichi", "Sora"],
              format: "standard",
              startedAt: Date.now(),
              spectators: 2,
              playerPreviews: [
                { avatarId: "greymon", cardId: "BT1-010" },
                { avatarUrl: "/account/avatar/sora/image?v=1", cardId: "BT1-001" },
              ],
            },
          ],
        }),
      ),
    );
    const props = renderHome();
    const watch = await screen.findByRole("button", { name: "Watch Taichi vs Sora" });
    const match = watch.closest("li")!;
    expect(match.querySelectorAll(".home-live__art img")).toHaveLength(2);
    expect(match.querySelectorAll(".home-live__player img")).toHaveLength(2);
    expect(match.querySelector('.home-live__player img[src="/account/avatar/sora/image?v=1"]')).toBeTruthy();
    fireEvent.click(watch);
    expect(props.onWatchLive).toHaveBeenCalledWith("ABCDEF");
  });

  it("nudges a guest to connect an account", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(props.onSignIn).toHaveBeenCalled();
  });

  it("drops the nudge once the player is signed in", () => {
    renderHome({ accountId: "account-1" });
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
  });

  it("goes straight to the dashboard without a welcome banner", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play now" })).toBeNull();
  });

  it("queues the selected deck for a ranked match", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    fireEvent.click(screen.getByRole("button", { name: "Find match" }));
    expect(props.onFindMatch).toHaveBeenCalledWith(HomeMatchQueue.RANKED.value);
  });

  it("hides the ranked choice and queues casual when ranked is off", () => {
    const props = renderHome({ rankedEnabled: false });
    expect(screen.queryByRole("button", { name: "Ranked" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Find match" }));
    expect(props.onFindMatch).toHaveBeenCalledWith(HomeMatchQueue.CASUAL.value);
  });

  it("opens practice, a private room and the free boosters", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Vs bot" }));
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));
    fireEvent.click(within(screen.getByText("Open a few booster packs").closest("section")!).getByRole("button"));
    expect(props.onPractice).toHaveBeenCalled();
    expect(props.onPrivateMatch).toHaveBeenCalled();
    expect(props.onOpenBooster).toHaveBeenCalled();
  });

  it("edits or plays a saved deck", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Edit Imperialdramon" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(props.onEditDeck).toHaveBeenCalledWith(deck);
    expect(props.onPlayDeck).toHaveBeenCalledWith(deck);
  });

  it("reports a bug from the footer", () => {
    const props = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(props.onReportBug).toHaveBeenCalled();
  });
});
