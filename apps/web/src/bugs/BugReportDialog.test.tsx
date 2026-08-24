// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { BugReportDialog } from "./BugReportDialog";

type Route = { status?: number; body: unknown };

function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const key = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
    const route = routes[key] ?? { status: 404, body: {} };
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDialog(signedIn = true) {
  return render(
    <I18nProvider>
      <BugReportDialog signedIn={signedIn} onClose={() => undefined} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the bug report modal", () => {
  // Reporting needs no account: a player who hits a broken card should not have to sign up first.
  it("takes a report from a visitor with no account", () => {
    renderDialog(false);
    expect(screen.getByRole("button", { name: "Send report" })).toBeTruthy();
    expect(screen.getByText(/Sign in first if you want us to be able to ask you follow-up questions/)).toBeTruthy();
  });

  it("tells a signed-in reporter their display name signs the issue", () => {
    renderDialog(true);
    expect(screen.getByText(/signed with your display name/)).toBeTruthy();
  });

  it("suggests cards by name and attaches the chosen one", async () => {
    mockApi({});
    renderDialog();
    fireEvent.change(screen.getByLabelText("Cards involved"), { target: { value: "agumon" } });

    const option = await screen.findByRole("option", { name: /BT1-010/ });
    fireEvent.click(option);

    expect(screen.getByLabelText("Remove BT1-010")).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so when no card matches the search", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Cards involved"), { target: { value: "zzzz-not-a-card" } });
    expect(await screen.findByText("No card matches that search.")).toBeTruthy();
  });

  it("keeps the send button disabled until both the overview and the steps are filled in", () => {
    renderDialog();
    const send = screen.getByRole("button", { name: "Send report" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Bug overview"), { target: { value: "on-play never fires" } });
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Steps to reproduce"), { target: { value: "play it, nothing" } });
    expect(send.disabled).toBe(false);
  });

  it("sends the attached cards and the description, then links the issue", async () => {
    const fetchMock = mockApi({
      "POST /bug-reports": { status: 201, body: { number: 42, url: "https://github.com/example/repo/issues/42" } },
    });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Bug overview"), { target: { value: "on-play never fires" } });
    fireEvent.change(screen.getByLabelText("Cards involved"), { target: { value: "BT1-010" } });
    fireEvent.click(await screen.findByRole("option", { name: /BT1-010/ }));
    fireEvent.change(screen.getByLabelText("Steps to reproduce"), { target: { value: "play it, nothing happens" } });
    fireEvent.change(screen.getByLabelText("Opponent's deck"), { target: { value: "Red Hybrid" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(await screen.findByText("Report sent")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open issue #42" }).getAttribute("href")).toBe(
      "https://github.com/example/repo/issues/42",
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      summary: "on-play never fires",
      cardIds: ["BT1-010"],
      description: "play it, nothing happens",
      opponentDeck: "Red Hybrid",
    });
    // Never typed by the reporter: the client knows which build it is.
    expect(body.clientRevision).toBeTruthy();
    expect(body.userAgent).toBeTruthy();
    expect(body).not.toHaveProperty("attachmentUrl");
  });

  it("sends the Discord link when the reporter pasted one", async () => {
    const fetchMock = mockApi({
      "POST /bug-reports": { status: 201, body: { number: 7, url: "https://github.com/example/repo/issues/7" } },
    });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Bug overview"), { target: { value: "broken" } });
    fireEvent.change(screen.getByLabelText("Steps to reproduce"), { target: { value: "broken" } });
    fireEvent.change(screen.getByLabelText("Discord link"), {
      target: { value: "https://discord.com/channels/1/2/3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await screen.findByText("Report sent");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { attachmentUrl: string };
    expect(body.attachmentUrl).toBe("https://discord.com/channels/1/2/3");
  });

  it("tells the reporter to use Discord when the tracker is unreachable", async () => {
    mockApi({ "POST /bug-reports": { status: 502, body: { error: "tracker_unavailable" } } });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Bug overview"), { target: { value: "broken" } });
    fireEvent.change(screen.getByLabelText("Steps to reproduce"), { target: { value: "broken" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() =>
      expect(screen.getByText("Reporting is unavailable right now. Tell us on Discord instead.")).toBeTruthy(),
    );
  });

  it("renders the refusal the API names", async () => {
    mockApi({ "POST /bug-reports": { status: 429, body: { error: "too_many_requests" } } });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Bug overview"), { target: { value: "again" } });
    fireEvent.change(screen.getByLabelText("Steps to reproduce"), { target: { value: "again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() =>
      expect(screen.getByText("Too many reports in a short time. Try again in a minute.")).toBeTruthy(),
    );
  });
});
