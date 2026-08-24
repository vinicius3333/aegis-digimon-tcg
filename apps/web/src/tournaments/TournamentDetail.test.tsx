// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { resetServerClock } from "./serverClock";
import { TournamentDetail } from "./TournamentDetail";
import type { TournamentDetail as TournamentDetailPayload } from "./types";

const DETAIL: TournamentDetailPayload = {
  id: "t-1",
  name: "Regional qualifier",
  status: "check_in",
  structure: "swiss",
  topCutEnabled: true,
  topCutSize: null,
  bestOf: 3,
  allowBots: false,
  rulesetPreset: "bandai_general",
  rulesetVersion: "bandai_general/1.0.0",
  startsAt: Date.parse("2026-08-13T18:00:00.000Z"),
  maxPlayers: 32,
  registeredCount: 2,
  banlistPolicy: { mode: "current" },
  block: "BT10",
  createdBy: "acc-organizer",
  winnerAccountId: null,
  rules: null,
  banlistCards: [
    { cardId: "BT2-047", status: "restricted", allowedCopies: 1 },
    { cardId: "BT5-109", status: "banned", allowedCopies: 0 },
    { cardId: "EX2-007", status: "banned_pair", allowedCopies: 4, pairPartnerIds: ["BT7-072"] },
  ],
  matches: [],
  participants: [
    { id: "p-1", kind: "human", displayName: "Tamer One", status: "checked_in", seed: 1 },
    { id: "p-2", kind: "bot", displayName: "Bot Two", status: "registered", seed: null },
  ],
};

function mockDetail(
  payload: Partial<TournamentDetailPayload> = {},
  extra: Record<string, { status?: number; body: unknown }> = {},
) {
  const routes: Record<string, { status?: number; body: unknown }> = {
    "GET /tournaments/t-1": { body: { ...DETAIL, ...payload } },
    ...extra,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
      const route = routes[key] ?? { status: 404, body: { error: "tournament_not_found" } };
      return new Response(JSON.stringify(route.body), {
        status: route.status ?? 200,
        headers: { "Content-Type": "application/json", Date: new Date().toUTCString() },
      });
    }),
  );
}

function renderDetail(accountId?: string, accountDisplayName?: string, accountIsAdmin = false) {
  return render(
    <I18nProvider>
      <TournamentDetail
        id="t-1"
        accountId={accountId}
        accountDisplayName={accountDisplayName}
        accountIsAdmin={accountIsAdmin}
        decks={[{ id: "deck-1", name: "Red aggro", mainDeck: [], eggDeck: [], color: "Red", blurb: "" }]}
        onBack={() => undefined}
      />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetServerClock();
});

describe("tournament detail", () => {
  it("blocks participation and offers the sign-in call to action when signed out", async () => {
    mockDetail({}, { "GET /auth/me": { body: null } });
    renderDetail(undefined);

    // The sign-in block from Settings, inline: the player can act, not just read a refusal.
    expect(await screen.findByRole("button", { name: /Sign in with Discord/ })).toBeTruthy();
    // No participation action is offered without an account.
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Drop out" })).toBeNull();
  });

  it("renders the frozen banlist with card names, status and allowed copies", async () => {
    mockDetail();
    renderDetail("acc-player");

    const banlist = (await screen.findByRole("heading", { name: "Banned cards in this event" })).closest(
      ".aegis-panel",
    ) as HTMLElement;
    // Names, not bare ids: resolved through the shared card data.
    expect(within(banlist).getByText("Argomon")).toBeTruthy();
    expect(within(banlist).getByText("Mega Digimon Fusion!")).toBeTruthy();
    expect(within(banlist).getByText("Restricted")).toBeTruthy();
    expect(within(banlist).getByText("Banned")).toBeTruthy();
    expect(within(banlist).getByText("Banned pair")).toBeTruthy();
    expect(within(banlist).getByText("1 copies allowed")).toBeTruthy();
    expect(within(banlist).getByText("0 copies allowed")).toBeTruthy();
    // The pair partner is named too, so a player is not left holding a card id.
    expect(within(banlist).getByText("Cannot share a deck with Eyesmon")).toBeTruthy();
    // The id stays visible alongside the name for deck-list cross-checking.
    expect(within(banlist).getByText("BT2-047")).toBeTruthy();
  });

  it("says there are no restrictions when the policy is unrestricted", async () => {
    mockDetail({ banlistPolicy: { mode: "none" }, banlistCards: [] });
    renderDetail("acc-player");
    expect(await screen.findByText("No restrictions here: bring any legal deck.")).toBeTruthy();
  });

  it("lists participants with their status and marks bots", async () => {
    mockDetail();
    renderDetail("acc-player");
    const participants = (await screen.findByRole("heading", { name: "Players" })).closest(
      ".aegis-panel",
    ) as HTMLElement;
    expect(within(participants).getByText("Tamer One")).toBeTruthy();
    expect(within(participants).getByText("Checked in")).toBeTruthy();
    expect(within(participants).getByText("Bot")).toBeTruthy();
    expect(within(participants).getByText("Signed up")).toBeTruthy();
  });

  it("shows the standings empty state until the server sends standings", async () => {
    mockDetail();
    renderDetail("acc-player");
    expect(await screen.findByText("Standings show up after the first round is scored.")).toBeTruthy();
  });

  it("renders standings when a later slice starts sending them", async () => {
    mockDetail({
      standings: [
        {
          participantId: "p-1",
          rank: 1,
          points: 9,
          matchWinRate: 1,
          opponentMatchWinRate: 0.5,
          wins: 3,
          losses: 0,
          draws: 0,
          byes: 0,
        },
      ],
    });
    renderDetail("acc-player");
    const standings = (await screen.findByRole("heading", { name: "Standings" })).closest(
      ".aegis-panel",
    ) as HTMLElement;
    expect(within(standings).getByText("Tamer One")).toBeTruthy();
    expect(within(standings).getByText("9 points")).toBeTruthy();
  });

  it("shows organizer controls only to the creator", async () => {
    mockDetail();
    const player = renderDetail("acc-player");
    await screen.findByRole("heading", { name: "Players" });
    expect(screen.queryByRole("heading", { name: "Organizer controls" })).toBeNull();
    player.unmount();

    renderDetail("acc-organizer");
    expect(await screen.findByRole("heading", { name: "Organizer controls" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close check-in" })).toBeTruthy();
  });

  it("shows only the delete control to an admin who is not the creator", async () => {
    mockDetail();
    renderDetail("acc-admin", undefined, true);

    expect(await screen.findByRole("heading", { name: "Admin controls" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete tournament" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close check-in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save schedule" })).toBeNull();
  });

  it("renders a participant failure code when registration is refused", async () => {
    mockDetail(
      { status: "registration", participants: [] },
      { "POST /tournaments/t-1/participants": { status: 409, body: { error: "tournament_full" } } },
    );
    renderDetail("acc-player");
    fireEvent.click(await screen.findByRole("button", { name: "Sign up" }));
    await waitFor(() => expect(screen.getByText("This event is full.")).toBeTruthy());
  });

  it("offers only the entry actions the published state supports", async () => {
    // check_in with the player already checked in: nothing to register, nothing to check into.
    mockDetail({
      status: "check_in",
      participants: [{ id: "p-1", kind: "human", displayName: "Tamer One", status: "checked_in", seed: 1 }],
    });
    const checkedIn = renderDetail("acc-player", "Tamer One");
    await screen.findByRole("heading", { name: "Your entry" });
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check in" })).toBeNull();
    expect(screen.getByRole("button", { name: "Drop out" })).toBeTruthy();
    expect(screen.getByText("Your entry: Checked in")).toBeTruthy();
    checkedIn.unmount();

    // A finished event offers nothing at all, and says so.
    mockDetail({ status: "finished", participants: [] });
    renderDetail("acc-player", "Tamer One");
    await screen.findByRole("heading", { name: "Your entry" });
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Drop out" })).toBeNull();
    expect(screen.getByText(/Nothing to do here right now/)).toBeTruthy();
  });

  it("still offers the action when the display name cannot identify the player", async () => {
    // Two humans share a name, so the payload cannot prove membership: the server decides.
    mockDetail({
      status: "registration",
      participants: [
        { id: "p-1", kind: "human", displayName: "Twin", status: "registered", seed: null },
        { id: "p-2", kind: "human", displayName: "Twin", status: "registered", seed: null },
      ],
    });
    renderDetail("acc-player", "Twin");
    expect(await screen.findByRole("button", { name: "Sign up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check in" })).toBeTruthy();
  });

  it("translates deck-legality violations instead of printing raw kinds", async () => {
    mockDetail(
      { status: "registration", participants: [] },
      {
        "POST /tournaments/t-1/participants": {
          status: 409,
          body: {
            error: "deck_illegal",
            violations: [
              { kind: "main_deck_size", size: 48, required: 50 },
              { kind: "over_copy_limit", cardId: "BT2-047", copies: 3, allowed: 1 },
            ],
          },
        },
      },
    );
    renderDetail("acc-player", "Tamer One");
    fireEvent.click(await screen.findByRole("button", { name: "Sign up" }));
    await waitFor(() => expect(screen.getByText("Your main deck has 48 cards. It needs exactly 50.")).toBeTruthy());
    expect(screen.getByText("Argomon: you have 3 copies, but only 1 are allowed.")).toBeTruthy();
  });

  it("renders the my-match skeleton without inventing series data", async () => {
    mockDetail();
    renderDetail("acc-player");
    const panel = (await screen.findByRole("heading", { name: "My match" })).closest(".aegis-panel") as HTMLElement;
    expect(within(panel).getByText("You do not have a match here yet.")).toBeTruthy();
  });

  it("marks presence, score and join deadline as pending when the payload carries no series", async () => {
    mockDetail({
      matches: [
        {
          id: "m-1",
          round: 2,
          position: 0,
          player0AccountId: "acc-player",
          player1AccountId: "acc-rival",
          winnerAccountId: null,
          status: "pending",
        },
      ],
    });
    renderDetail("acc-player");
    const panel = (await screen.findByRole("heading", { name: "My match" })).closest(".aegis-panel") as HTMLElement;
    expect(within(panel).getByText("2")).toBeTruthy();
    expect(within(panel).getByText("acc-rival")).toBeTruthy();
    expect(within(panel).getByText("Not reported yet")).toBeTruthy();
    expect(within(panel).getByText("Not started, first to 2 wins")).toBeTruthy();
    expect(within(panel).getByText("No deadline")).toBeTruthy();
    expect(within(panel).getByText("No deadline set")).toBeTruthy();
  });
});
