// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveMatchPage } from "@aegis/shared/protocol/LiveMatch";
import { RankedTier } from "@aegis/shared/ranked/RankedTier";
import type { RankedLeaderboard } from "@aegis/shared/ranked/RankedContracts";
import type { PublicReplayPage } from "@aegis/shared/replays/PublicReplay";
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
    onOpenReplay: vi.fn<(replayId: string) => void>(),
    onOpenPublicReplays: vi.fn<() => void>(),
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

let liveMatchPage: LiveMatchPage;
let publicReplayPage: PublicReplayPage;
let rankedLeaderboard: RankedLeaderboard;
let rankedResponseStatus: number;
const requestedUrls: string[] = [];

beforeEach(() => {
  liveMatchPage = { matches: [], total: 0 };
  publicReplayPage = { replays: [] };
  requestedUrls.length = 0;
  rankedLeaderboard = {
    season: { id: 2, startsAt: 0, endsAt: 1, finalized: false, formats: ["standard"] },
    entries: [],
    mine: null,
    page: 1,
    total: 0,
  };
  rankedResponseStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/ranked/leaderboard")) {
        return new Response(JSON.stringify(rankedLeaderboard), { status: rankedResponseStatus });
      }
      if (url.includes("/tournaments")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      const page = url.includes("/replays/public") ? publicReplayPage : liveMatchPage;
      return new Response(JSON.stringify(page), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  localStorage.removeItem("aegis:locale");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the home screen", () => {
  it("renders live player portraits and public card previews without changing the watch action", async () => {
    liveMatchPage = {
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
    };
    const props = renderHome();
    const watch = await screen.findByRole("button", { name: "Watch Taichi vs Sora" });
    const match = watch.closest("li")!;
    expect(match.querySelectorAll(".live-match-card__art img")).toHaveLength(2);
    expect(match.querySelectorAll(".live-match-card__player img")).toHaveLength(2);
    expect(match.querySelector('.live-match-card__player img[src="/account/avatar/sora/image?v=1"]')).toBeTruthy();
    fireEvent.click(watch);
    expect(props.onWatchLive).toHaveBeenCalledWith("ABCDEF");
  });

  it("lists public replays and opens the chosen one or the full list", async () => {
    publicReplayPage = {
      replays: [
        {
          id: "public-replay",
          viewerSeat: 0,
          format: "BT15",
          savedAt: 3,
          summary: {
            id: "match",
            players: ["Taichi", "Yamato"],
            deckIcons: ["BT1-010", null],
            mode: "casual",
            startedAt: 1,
            finishedAt: Date.UTC(2026, 9, 30),
            winnerSeat: 0,
            frameCount: 10,
          },
        },
      ],
    };
    const props = renderHome();
    fireEvent.click(await screen.findByRole("button", { name: "Watch replay: Taichi vs Yamato" }));
    expect(props.onOpenReplay).toHaveBeenCalledWith("public-replay");
    const card = screen.getByRole("heading", { name: "Public replays" }).closest("section")!;
    expect(within(card).getByText("BT15 · Standard")).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: "See all" }));
    expect(props.onOpenPublicReplays).toHaveBeenCalledOnce();
  });

  it("explains an empty public replay list", async () => {
    renderHome();
    expect(await screen.findByText("No public replays yet.")).toBeTruthy();
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

  it("queues the selected deck for a ranked match", async () => {
    const onOpenRanked = vi.fn<() => void>();
    const props = renderHome({ accountId: "mine", onOpenRanked });
    expect(screen.getByRole("button", { name: "Find casual match" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    const summary = screen.getByRole("link", { name: "View ranked details" });
    expect(summary.getAttribute("href")).toBe("/ranked");
    await screen.findByText("Not yet ranked this season");
    fireEvent.click(summary);
    expect(onOpenRanked).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Find ranked match" }));
    expect(props.onFindMatch).toHaveBeenCalledWith(HomeMatchQueue.RANKED.value);
  });

  it("starts on casual and allows switching modes without a deck", () => {
    renderHome({ activeDeck: undefined });
    expect(screen.getByRole("button", { name: "Casual" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    expect(screen.getByRole("button", { name: "Ranked" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Find ranked match" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Casual" }));
    expect(screen.getByRole("button", { name: "Find casual match" })).toBeTruthy();
  });

  it("shows loading before confirmed empty ranked data", async () => {
    renderHome({ accountId: "mine" });
    expect(requestedUrls.some((url) => url.includes("/ranked/leaderboard"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    const summary = screen.getByRole("link", { name: "View ranked details", description: "Loading..." });
    expect(within(summary).queryByText("Not yet ranked this season")).toBeNull();
    expect(await within(summary).findByText("Not yet ranked this season")).toBeTruthy();
  });

  it("does not report a failed ranked request as an empty standing", async () => {
    rankedResponseStatus = 503;
    localStorage.setItem("aegis:locale", "zh-CN");
    renderHome({ accountId: "mine" });
    fireEvent.click(screen.getByRole("button", { name: "排位" }));
    const summary = screen.getByRole("link", { name: "查看排位详情" });
    expect(screen.getByRole("button", { name: "寻找排位对战" })).toBeTruthy();
    expect(await within(summary).findByText("暂时无法加载排位数据")).toBeTruthy();
    expect(within(summary).queryByText("本赛季尚未参与排位")).toBeNull();
  });

  it("does not request personal ranked data before an account is available", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    expect(
      screen.getByRole("link", { name: "View ranked details", description: "Ranked data unavailable" }),
    ).toBeTruthy();
    expect(requestedUrls.some((url) => url.includes("/ranked/leaderboard"))).toBe(false);
  });

  it("refreshes the accessible ranked score on re-entry without polling the leaderboard", async () => {
    vi.useFakeTimers();
    const standing = {
      accountId: "mine",
      displayName: "Player",
      position: 3,
      rating: 1234,
      peakRating: 1234,
      tier: RankedTier.GOLD.value,
      region: null,
      wins: 7,
      losses: 3,
      draws: 0,
      games: 10,
      winrate: 0.7,
      provisional: false,
    };
    rankedLeaderboard.mine = standing;
    renderHome({ accountId: standing.accountId });
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    await act(async () => {});
    expect(screen.getByRole("link", { name: "View ranked details", description: /Gold 1,234 pts.*#3/ })).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(requestedUrls.filter((url) => url.includes("/ranked/leaderboard"))).toHaveLength(1);
    cleanup();
    rankedLeaderboard.mine = { ...standing, rating: 1250 };
    renderHome({ accountId: standing.accountId });
    fireEvent.click(screen.getByRole("button", { name: "Ranked" }));
    await act(async () => {});
    expect(screen.getByRole("link", { name: "View ranked details", description: /1,250 pts/ })).toBeTruthy();
    expect(requestedUrls.filter((url) => url.includes("/ranked/leaderboard"))).toHaveLength(2);
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
