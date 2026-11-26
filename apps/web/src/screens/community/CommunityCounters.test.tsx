import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { RankedMetaCounters } from "@aegis/shared/ranked/RankedContracts";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CommunityCounters } from "@/screens/community/CommunityCounters";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const decks: RankedMetaCounters[] = [
  {
    archetype: "Examon",
    coverCardId: null,
    colors: ["Red"],
    games: 3963,
    share: 0.09,
    counters: [
      {
        archetype: "Jupitermon",
        coverCardId: null,
        colors: [],
        games: 325,
        pilots: 99,
        wins: 191,
        losses: 134,
        draws: 0,
        winrate: 0.588,
        interval: [0.533, 0.64],
      },
      {
        archetype: "Puppets",
        coverCardId: null,
        colors: [],
        games: 76,
        pilots: 17,
        wins: 46,
        losses: 30,
        draws: 0,
        winrate: 0.605,
        interval: [0.493, 0.708],
      },
    ],
  },
  { archetype: "Toho Braves", coverCardId: null, colors: [], games: 1965, share: 0.044, counters: [] },
];

it("lists each meta deck's best counters with win rate, sample and likely range", async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(decks), { status: 200, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <I18nProvider>
      <CommunityCounters format="standard" />
    </I18nProvider>,
  );

  const examon = await screen.findByRole("list", { name: "Counters to Examon" });
  const [jupitermon, puppets] = within(examon).getAllByRole("listitem");
  expect(jupitermon!.textContent).toContain("Jupitermon");
  expect(jupitermon!.textContent).toContain("58.8%");
  expect(jupitermon!.textContent).toContain("Favored");
  expect(jupitermon!.textContent).toContain("325 games · 99 players · likely 53.3%–64%");
  expect(puppets!.textContent).toContain("Close");
  expect(screen.getByText("9% of decks played")).toBeTruthy();
  expect(screen.getByText("No deck has a winning record against it with enough games yet.")).toBeTruthy();
  const url = new URL(String(fetchMock.mock.calls[0]![0]), "http://localhost");
  expect(url.pathname).toMatch(/\/ranked\/counters$/);
  expect(url.searchParams.get("format")).toBe("standard");
  expect(url.searchParams.get("origin")).toBe("ranked");
});
