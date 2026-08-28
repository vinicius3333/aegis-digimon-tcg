// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { resetServerClock } from "./serverClock";
import { TournamentsScreen } from "./TournamentsScreen";
import type { TournamentListing } from "./types";

const LIGHTNING: TournamentListing = {
  id: "t-lightning",
  name: "Friday lightning",
  status: "registration",
  structure: "single_elimination",
  topCutEnabled: false,
  topCutSize: null,
  bestOf: 1,
  allowBots: true,
  rulesetPreset: "aegis_lightning",
  rulesetVersion: "aegis_lightning/1.0.0",
  startsAt: Date.parse("2026-08-13T18:00:00.000Z"),
  maxPlayers: 8,
  registeredCount: 3,
  banlistPolicy: { mode: "none" },
  block: "BT10",
  createdBy: "acc-1",
  winnerAccountId: null,
};

const REGIONAL: TournamentListing = {
  ...LIGHTNING,
  id: "t-regional",
  name: "Regional qualifier",
  structure: "swiss",
  topCutEnabled: true,
  topCutSize: 8,
  bestOf: 3,
  allowBots: false,
  rulesetPreset: "bandai_general",
  maxPlayers: 64,
  registeredCount: 40,
  banlistPolicy: { mode: "as_of_set", setId: "BT10" },
};

type Route = { status?: number; body: unknown };

function mockApi(routes: Record<string, Route>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const url = String(input);
    const key = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const route = routes[key] ?? { status: 404, body: { error: "tournament_not_found" } };
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json", Date: new Date().toUTCString() },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

function renderScreen() {
  return render(
    <I18nProvider>
      <TournamentsScreen
        decks={[{ id: "deck-1", name: "Red aggro", mainDeck: [], eggDeck: [], color: "Red", blurb: "" }]}
      />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetServerClock();
});

describe("tournament catalog", () => {
  beforeEach(() => {
    mockApi({
      "GET /tournaments": { body: [LIGHTNING, REGIONAL] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
    });
  });

  it("renders each event's status, slots, structure, format and badges", async () => {
    renderScreen();

    const lightning = (await screen.findByRole("heading", { name: "Friday lightning" })).closest("li") as HTMLElement;
    expect(within(lightning).getByText("Sign-ups open")).toBeTruthy();
    expect(within(lightning).getByText("3 of 8 players")).toBeTruthy();
    expect(within(lightning).getByText("Single elimination")).toBeTruthy();
    expect(within(lightning).getByText("Best of 1")).toBeTruthy();
    expect(within(lightning).getByText("Bots allowed")).toBeTruthy();
    expect(within(lightning).getByText("No restrictions")).toBeTruthy();
    expect(within(lightning).queryByText("Top Cut")).toBeNull();

    const regional = screen.getByRole("heading", { name: "Regional qualifier" }).closest("li") as HTMLElement;
    expect(within(regional).getByText("Swiss")).toBeTruthy();
    expect(within(regional).getByText("Top Cut")).toBeTruthy();
    expect(within(regional).getByText("Banned cards as of BT10")).toBeTruthy();
    expect(within(regional).queryByText("Bots allowed")).toBeNull();
  });

  it("reads registeredCount, not the deprecated registrations alias", async () => {
    cleanup();
    mockApi({
      // The server still sends both; a card built on the alias would show 99.
      "GET /tournaments": { body: [{ ...LIGHTNING, registrations: 99 }] },
      "GET /auth/me": { body: null },
    });
    renderScreen();
    expect(await screen.findByText("3 of 8 players")).toBeTruthy();
    expect(screen.queryByText("99 of 8 players")).toBeNull();
  });

  it("does not offer tournament creation to a non-admin", async () => {
    cleanup();
    mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-2", displayName: "Player", avatarUrl: null, isAdmin: false } },
    });
    renderScreen();
    await screen.findByText("New tournaments are announced here. Check back soon.");
    expect(screen.queryByRole("button", { name: "Create tournament" })).toBeNull();
  });
});

describe("tournament creation form", () => {
  beforeEach(() => {
    mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
    });
  });

  async function openForm() {
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Create tournament" }));
    return await screen.findByRole("heading", { name: "New tournament" });
  }

  it("shows the Top Cut switch only for a Swiss structure", async () => {
    await openForm();
    expect(screen.queryByRole("switch", { name: /Top Cut/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Ruleset"), { target: { value: "bandai_general" } });
    fireEvent.change(screen.getByLabelText("Structure"), { target: { value: "swiss" } });
    expect(screen.getByRole("switch", { name: /Top Cut/ })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Structure"), { target: { value: "single_elimination" } });
    expect(screen.queryByRole("switch", { name: /Top Cut/ })).toBeNull();
  });

  it("disables the unrestricted banlist mode unless the preset is an Aegis custom one", async () => {
    await openForm();
    const banlist = screen.getByLabelText("Banned cards") as HTMLSelectElement;
    const unrestricted = within(banlist).getByRole("option", { name: "No restrictions" }) as HTMLOptionElement;
    expect(unrestricted.disabled).toBe(false);
    expect(banlist.value).toBe("none");

    fireEvent.change(screen.getByLabelText("Ruleset"), { target: { value: "bandai_general" } });
    expect(unrestricted.disabled).toBe(true);
    // The official preset cannot run unrestricted, so the mode moves off "none" rather than
    // waiting for the server to reject it.
    expect(banlist.value).toBe("current");
    expect(screen.getByText("To allow every card, pick an Aegis custom ruleset.")).toBeTruthy();
  });

  it("previews the resolved banlist with card names and allowed copies", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Banned cards"), { target: { value: "as_of_set" } });
    fireEvent.change(screen.getByLabelText("Set"), { target: { value: "BT10" } });

    const preview = screen.getByRole("region", { name: "Banned cards preview" });
    // BT10 released 2022-10-14; the 2022-08-01 restriction of Tommy Himi is in force by then.
    expect(within(preview).getByText("Tommy Himi")).toBeTruthy();
    expect(within(preview).getAllByText("Restricted").length).toBeGreaterThan(0);
    expect(within(preview).getAllByText("1 copies allowed").length).toBeGreaterThan(0);
    // ...while a 2023 restriction is not.
    expect(within(preview).queryByText("Blossomon")).toBeNull();
  });

  it("submits the chosen banlist mode and set, which is what the server freezes", async () => {
    const fetchMock = mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
      "POST /tournaments": { status: 201, body: { ...LIGHTNING, banlistCards: [] } },
    });
    await openForm();
    fireEvent.change(screen.getByLabelText("Banned cards"), { target: { value: "as_of_set" } });
    fireEvent.change(screen.getByLabelText("Set"), { target: { value: "BT10" } });
    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    const postedBody = async () => {
      const call = fetchMock.mock.calls.find(
        (args: unknown[]) => (args[1] as RequestInit | undefined)?.method === "POST",
      );
      return call === undefined ? undefined : JSON.parse(String((call[1] as RequestInit).body));
    };
    await waitFor(async () => expect(await postedBody()).toBeDefined());
    expect((await postedBody()).banlist).toEqual({ mode: "as_of_set", setId: "BT10" });
  });

  it("shows Swiss round and cut estimates, labelled as pending check-in close", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Ruleset"), { target: { value: "bandai_general" } });
    fireEvent.change(screen.getByLabelText("Structure"), { target: { value: "swiss" } });
    fireEvent.change(screen.getByLabelText("Maximum players"), { target: { value: "16" } });

    const estimates = screen.getByRole("region", { name: "Estimates" });
    expect(within(estimates).getByText("About 4 Swiss rounds")).toBeTruthy();
    expect(within(estimates).getByText("No Top Cut")).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: /Top Cut/ }));
    expect(within(estimates).getByText("Roughly a Top 2 cut")).toBeTruthy();
    expect(within(estimates).getByText(/locked in when check-in closes/)).toBeTruthy();
  });

  it("renders the server's validation reason codes inline", async () => {
    mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
      "POST /tournaments": {
        status: 400,
        body: {
          error: "invalid tournament",
          reasons: [
            { code: "name_too_short", field: "name" },
            { code: "starts_at_in_past", field: "startsAt" },
          ],
        },
      },
    });
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    await waitFor(() => expect(screen.getAllByText("That name is too short.").length).toBeGreaterThan(0));
    expect(screen.getAllByText("That start time has already passed. Pick a later one.").length).toBeGreaterThan(0);
  });

  it("renders an unknown reason code verbatim instead of a blank message", async () => {
    mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
      "POST /tournaments": {
        status: 400,
        body: { error: "invalid tournament", reasons: [{ code: "future_code_we_do_not_know", field: "name" }] },
      },
    });
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));
    await waitFor(() => expect(screen.getAllByText(/future_code_we_do_not_know/).length).toBeGreaterThan(0));
  });
});

describe("app navigation", () => {
  it("keeps the tournaments area hidden in the client shell", async () => {
    mockApi({
      "GET /tournaments": { body: [] },
      "GET /auth/me": { body: { id: "acc-1", displayName: "Tamer", avatarUrl: null, isAdmin: true } },
      "GET /account/decks": { body: [] },
    });
    const { AegisClient } = await import("../App");
    render(
      <I18nProvider>
        <AegisClient
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          setPlayer={() => undefined}
          decks={[]}
          activeDeckId=""
          setActiveDeckId={() => undefined}
          saveDeck={() => undefined}
          dark={false}
          setDark={() => undefined}
          initialScreen="tournaments"
        />
      </I18nProvider>,
    );
    await waitFor(() => expect(document.getElementById("aegis-main")).toBeTruthy());
    expect(screen.queryByRole("heading", { name: "Tournaments", level: 1 })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create tournament" })).toBeNull();
  }, 20_000);
});
