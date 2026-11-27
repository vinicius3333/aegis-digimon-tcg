// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { BugReportDialog } from "./BugReportDialog";
import type { LocalReplay } from "@/replays/local";

const savedReplays = new Map<string, LocalReplay>();

vi.mock("@/replays/local", async (original) => ({
  ...(await original<typeof import("@/replays/local")>()),
  localReplaysByMatch: async () => savedReplays,
}));

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

function renderDialog(signedIn = true, matchLogId?: string) {
  return render(
    <I18nProvider>
      <BugReportDialog signedIn={signedIn} matchLogId={matchLogId} onClose={() => undefined} />
    </I18nProvider>,
  );
}

afterEach(() => {
  savedReplays.clear();
  cleanup();
  vi.unstubAllGlobals();
});

describe("the feedback modal", () => {
  // Reporting needs no account: a player who hits a broken card should not have to sign up first.
  it("takes feedback from a visitor with no account", () => {
    renderDialog(false);
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(screen.getByText(/sign in first if you want us to reply/)).toBeTruthy();
  });

  it("tells a signed-in reporter their display name signs the issue", () => {
    renderDialog(true);
    expect(screen.getByText(/signed with your display name/)).toBeTruthy();
  });

  it.each([
    [true, /Follow it in My feedback/],
    [false, /Sign in first if you want to follow it/],
  ])("drops the GitHub warning when the deployment keeps reports private (signed in: %s)", async (signedIn, text) => {
    mockApi({ "GET /bug-reports/limits": { body: { enabled: true, publicMirror: false } } });
    renderDialog(signedIn);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.queryByText(/GitHub/)).toBeNull();
  });

  it("keeps the send button disabled until both the title and the details are filled in", () => {
    renderDialog();
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "on-play never fires" } });
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "play it, nothing" } });
    expect(send.disabled).toBe(false);
  });

  it("sends the title and the description, without linking the issue", async () => {
    const fetchMock = mockApi({
      "POST /bug-reports": { status: 201, body: { number: 42, url: "https://github.com/example/repo/issues/42" } },
    });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "on-play never fires" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "play it, nothing happens" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Feedback sent")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /issue/i })).toBeNull();
    const body = JSON.parse(
      String(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      kind: "bug",
      summary: "on-play never fires",
      cardIds: [],
      description: "play it, nothing happens",
    });
    expect(body).not.toHaveProperty("opponentDeck");
    expect(body.clientRevision).toBeTruthy();
    expect(body.userAgent).toBeTruthy();
  });

  it("offers a bug and an idea, nothing else, and asks two questions for each", () => {
    renderDialog();
    expect(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual([
      "bug",
      "improvement",
    ]);
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByLabelText("What happened?")).toBeTruthy();
    expect(screen.queryByLabelText("Cards involved")).toBeNull();
    expect(screen.queryByLabelText("Opponent's deck")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Idea" }));
    expect(screen.getByLabelText("Idea", { selector: "input[type=text], input:not([type])" })).toBeTruthy();
    expect(screen.getByLabelText("What problem would it solve?")).toBeTruthy();
  });

  it("keeps the match ID out of the form but in the report", async () => {
    const fetchMock = mockApi({ "POST /bug-reports": { status: 201, body: { number: 7 } } });
    renderDialog(true, "f62249e5-ba6e-4528-b517-63bee8fbbb0f");
    expect(screen.queryByText(/f62249e5/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Feedback sent");
    const body = JSON.parse(
      String(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body.matchId).toBe("f62249e5-ba6e-4528-b517-63bee8fbbb0f");
  });

  it.each([undefined, "f62249e5-ba6e-4528-b517-63bee8fbbb0f"])(
    "carries the current match ID when available (%s)",
    async (matchId) => {
      const fetchMock = mockApi({
        "POST /bug-reports": { status: 201, body: { number: 42, url: "https://github.com/example/repo/issues/42" } },
      });
      renderDialog(false, matchId);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "broken" } });
      fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "broken" } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      await screen.findByText("Feedback sent");
      const body = JSON.parse(
        String(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body),
      ) as Record<string, unknown>;
      expect(body.matchId).toBe(matchId);
      expect(Object.hasOwn(body, "matchId")).toBe(matchId !== undefined);
    },
  );

  it("starts on Bug without the discontinued fields", () => {
    renderDialog();
    expect((screen.getByRole("radio", { name: "Bug" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Discord link")).toBeNull();
  });

  it("sends an idea with its kind", async () => {
    const fetchMock = mockApi({
      "POST /bug-reports": { status: 201, body: { number: 7, url: "https://github.com/example/repo/issues/7" } },
    });
    renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: "Idea" }));
    fireEvent.change(screen.getByLabelText("Idea", { selector: "input[type=text], input:not([type])" }), {
      target: { value: "show the trash count" },
    });
    fireEvent.change(screen.getByLabelText("What problem would it solve?"), { target: { value: "it would help" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Feedback sent");
    const body = JSON.parse(
      String(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({ kind: "improvement", cardIds: [], description: "it would help" });
    expect(body).not.toHaveProperty("opponentDeck");
  });

  it("tells the reporter to use Discord when the tracker is unreachable", async () => {
    mockApi({ "POST /bug-reports": { status: 502, body: { error: "tracker_unavailable" } } });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "broken" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "broken" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(screen.getByText("Feedback is unavailable right now. Tell us on Discord instead.")).toBeTruthy(),
    );
  });

  it("renders the refusal the API names", async () => {
    mockApi({ "POST /bug-reports": { status: 429, body: { error: "too_many_requests" } } });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "again" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(screen.getByText("You sent a lot in a short time. Try again in a minute.")).toBeTruthy(),
    );
  });

  // Issue #54: a misclick outside the dialog threw away a half-written report.
  describe("keeps a draft from closing by accident", () => {
    function renderClosable() {
      const onClose = vi.fn<() => void>();
      render(
        <I18nProvider>
          <BugReportDialog signedIn onClose={onClose} />
        </I18nProvider>,
      );
      return onClose;
    }

    it("stays open when the reporter clicks outside it", () => {
      mockApi({});
      const onClose = renderClosable();
      fireEvent.click(document.querySelector(".aegis-dialog-layer")!);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("ignores Escape once something is typed, and keeps the text", () => {
      mockApi({});
      const onClose = renderClosable();
      fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "half a sentence" } });
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText<HTMLTextAreaElement>("What happened?").value).toBe("half a sentence");
    });

    it("still closes with Escape while the form is empty, and always with Cancel", () => {
      mockApi({});
      const onClose = renderClosable();
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "draft" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});

describe("the playtest group opt-in", () => {
  it("is not offered to a visitor without an account", () => {
    mockApi({});
    renderDialog(false);
    expect(screen.queryByLabelText("Join the playtest group")).toBeNull();
  });

  it("is pre-checked for a member and saves the change after the report is sent", async () => {
    const fetchMock = mockApi({
      "GET /account/playtest": { body: { member: true, since: 1 } },
      "PUT /account/playtest": { body: { member: false, since: null } },
      "POST /bug-reports": { status: 201, body: { number: 7 } },
    });
    renderDialog(true);
    const box = (await screen.findByLabelText("Join the playtest group")) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Feedback sent");
    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
      expect(put).toBeTruthy();
      expect(JSON.parse(String(put![1]?.body))).toEqual({ member: false });
    });
    const order = fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET");
    expect(order.indexOf("POST")).toBeLessThan(order.indexOf("PUT"));
  });

  it("does not call the opt-in when nothing changed", async () => {
    const fetchMock = mockApi({
      "GET /account/playtest": { body: { member: false, since: null } },
      "POST /bug-reports": { status: 201, body: { number: 7 } },
    });
    renderDialog(true);
    await screen.findByLabelText("Join the playtest group");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Feedback sent");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("keeps the report's success when saving the opt-in fails", async () => {
    mockApi({
      "GET /account/playtest": { body: { member: false, since: null } },
      "PUT /account/playtest": { status: 500, body: {} },
      "POST /bug-reports": { status: 201, body: { number: 7 } },
    });
    renderDialog(true);
    fireEvent.click(await screen.findByLabelText("Join the playtest group"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Feedback sent")).toBeTruthy();
    expect(await screen.findByText(/could not save your playtest group choice/i)).toBeTruthy();
  });
});

describe("attaching a saved match", () => {
  const saved: LocalReplay = {
    key: "match-1:0",
    matchId: "match-1",
    viewerSeat: 0,
    summary: {
      id: "match-1",
      players: ["Tamer", "Rival"],
      mode: "casual",
      startedAt: Date.UTC(2026, 10, 24, 9, 30),
      finishedAt: Date.UTC(2026, 10, 24, 10, 0),
      winnerSeat: 0,
      frameCount: 3,
    },
    data: btoa("replay"),
    savedAt: Date.UTC(2026, 10, 24, 10, 0),
  };

  it("uploads the chosen match after the report is filed", async () => {
    savedReplays.set(saved.matchId, saved);
    const fetchMock = mockApi({
      "POST /bug-reports": { status: 201, body: { number: 42, reportId: 7 } },
      "PUT /bug-reports/7/replay-file": { status: 204, body: {} },
    });
    renderDialog();

    fireEvent.change(await screen.findByLabelText("Attach a saved match (optional)"), {
      target: { value: saved.key },
    });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Raid after digivolving" } });
    fireEvent.change(screen.getByLabelText("What happened?"), { target: { value: "Raid was offered" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
    const upload = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(new URL(String(upload[0])).pathname).toBe("/bug-reports/7/replay-file");
    expect((upload[1]!.body as Blob).size).toBe("replay".length);
  });

  it("offers no saved match when the report comes from inside a match", async () => {
    savedReplays.set(saved.matchId, saved);
    mockApi({});
    renderDialog(true, "4a1f6c1e-0f0e-4c4b-9f1a-2b3c4d5e6f70");
    await screen.findByLabelText("Title");
    expect(screen.queryByLabelText("Attach a saved match (optional)")).toBeNull();
  });
});
