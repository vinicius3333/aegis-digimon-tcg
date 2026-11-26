// @vitest-environment jsdom
import type { ForumDetail, ForumItem } from "@aegis/shared/feedback/Forum";
import type { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { ForumScreen } from "@/bugs/ForumScreen";

const item: ForumItem = {
  id: 7,
  summary: "Dianamon skips the DNA prompt",
  description: "It digivolved without asking.",
  cardIds: ["BT25-028"],
  status: "new",
  createdAt: Date.UTC(2026, 10, 20),
  commentCount: 1,
  outcome: null,
  myVote: null,
  ownReport: false,
  hasReplay: false,
  upvotes: null,
};
const detail: ForumDetail = {
  ...item,
  comments: [{ id: 1, authorName: "Mika", body: "Only with exactly four cards.", createdAt: Date.now() }],
  teamReply: null,
  tally: null,
  canModerate: false,
};
const page = (items: ForumItem[], total = items.length, current = 1) => ({ items, page: current, pageSize: 10, total });

function mockApi(handler: (url: string, init?: RequestInit) => [number, unknown]) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.includes("/summary")) return new Response(JSON.stringify({ open: 1, awaitingVote: 1, aegisCoins: 5 }));
    const [status, body] = handler(url, init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(props: { signedIn?: boolean; reportId?: number; board?: ForumBoard } = {}) {
  const callbacks = { onSignIn: vi.fn<() => void>(), onOpen: vi.fn<(id?: number) => void>() };
  render(
    <I18nProvider>
      <ForumScreen
        board={props.board ?? "bugs"}
        signedIn={props.signedIn ?? true}
        reportId={props.reportId}
        metaAvailable={false}
        onSectionChange={vi.fn<() => void>()}
        {...callbacks}
      />
    </I18nProvider>,
  );
  return callbacks;
}

function ForumWithRoutes() {
  const [reportId, setReportId] = useState<number>();
  vi.spyOn(window.history, "back").mockImplementation(() => setReportId(undefined));
  return (
    <I18nProvider>
      <ForumScreen
        board="bugs"
        signedIn
        reportId={reportId}
        metaAvailable={false}
        onSectionChange={vi.fn<() => void>()}
        onSignIn={vi.fn<() => void>()}
        onOpen={(id) => setReportId(id)}
      />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ForumScreen", () => {
  it("asks guests to sign in", () => {
    mockApi(() => [200, {}]);
    const { onSignIn } = show({ signedIn: false });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("lists open reports, shows the coin balance and opens a thread", async () => {
    mockApi(() => [200, page([item])]);
    const { onOpen } = show();
    fireEvent.click(await screen.findByRole("link", { name: "Dianamon skips the DNA prompt" }));
    expect(onOpen).toHaveBeenCalledWith(7);
    expect(await screen.findByText("5")).toBeTruthy();
    expect(screen.getByText("Vote")).toBeTruthy();
  });

  it("goes back to the same tab after opening a thread from the list", async () => {
    mockApi((url) => (url.includes("/feedback/bugs/7") ? [200, detail] : [200, page([item])]));
    render(<ForumWithRoutes />);
    fireEvent.click(await screen.findByRole("button", { name: "Decided" }));
    fireEvent.click(await screen.findByRole("link", { name: "Dianamon skips the DNA prompt" }));
    fireEvent.click(await screen.findByRole("button", { name: "All bug reports" }));

    expect(window.history.back).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Decided", pressed: true })).toBeTruthy();
  });

  it("pages through more than ten reports", async () => {
    const fetchMock = mockApi((url) =>
      url.includes("page=2") ? [200, page([{ ...item, id: 1, summary: "Oldest" }], 11, 2)] : [200, page([item], 11)],
    );
    show();
    expect(await screen.findByText("1–10 of 11", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(await screen.findByRole("link", { name: "Oldest" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("state=open&page=2"))).toBe(true);
  });

  it("casts a vote with a reason and keeps the tally hidden", async () => {
    const fetchMock = mockApi((url, init) =>
      url.endsWith("/7/vote") && init?.method === "PUT"
        ? [200, { ...detail, myVote: { verdict: "yes", reason: "The card says may, so it must ask." } }]
        : [200, detail],
    );
    show({ reportId: 7 });

    fireEvent.click(await screen.findByRole("radio", { name: /^Bug/ }));
    const submit = screen.getByRole("button", { name: "Cast vote" });
    fireEvent.change(screen.getByLabelText("Why?"), { target: { value: "short" } });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Why?"), { target: { value: "The card says may, so it must ask." } });
    fireEvent.click(submit);

    expect(await screen.findByText("You voted: bug")).toBeTruthy();
    expect(screen.queryByText("The team decided")).toBeNull();
    const voteCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/7/vote"));
    expect(JSON.parse(String(voteCall?.[1]?.body))).toEqual({
      verdict: "yes",
      reason: "The card says may, so it must ask.",
    });
  });

  it("moves between the verdicts with the arrow keys and keeps one tab stop", async () => {
    mockApi(() => [200, detail]);
    show({ reportId: 7 });
    const bug = await screen.findByRole("radio", { name: /^Bug/ });
    const notBug = screen.getByRole("radio", { name: /^Not a bug/ });
    expect([bug.tabIndex, notBug.tabIndex]).toEqual([0, -1]);

    fireEvent.keyDown(bug, { key: "ArrowRight" });

    expect(notBug.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(notBug);
    expect([bug.tabIndex, notBug.tabIndex]).toEqual([-1, 0]);
  });

  it("shows the decision, the split and everyone's reasons once a report is closed", async () => {
    mockApi(() => [
      200,
      {
        ...detail,
        status: "wont_fix",
        outcome: "no",
        myVote: { verdict: "no", reason: "One icon is your own deck." },
        tally: { yes: 1, no: 2, ballots: [{ verdict: "no", reason: "One icon is your own deck.", authorName: "Rin" }] },
      },
    ]);
    show({ reportId: 7 });
    expect(await screen.findByText("The team decided")).toBeTruthy();
    expect(screen.getByText("Your vote matched. You earned 1 Aegis coin.")).toBeTruthy();
    expect(screen.getByText("One icon is your own deck.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cast vote" })).toBeNull();
  });

  it("offers the saved replay of a bug report", async () => {
    mockApi(() => [200, { ...detail, hasReplay: true }]);
    show({ reportId: 7 });
    expect(await screen.findByRole("button", { name: "Watch replay" })).toBeTruthy();
  });

  it("lets admins delete comments and votes", async () => {
    const fetchMock = mockApi((url, init) => {
      if (init?.method === "DELETE" && url.endsWith("/7/comments/1")) return [200, { ...admin, comments: [] }];
      if (init?.method === "DELETE" && url.endsWith("/7/votes/voter-1"))
        return [200, { ...admin, tally: { yes: 0, no: 0, ballots: [] } }];
      return [200, admin];
    });
    const admin: ForumDetail = {
      ...detail,
      canModerate: true,
      tally: {
        yes: 1,
        no: 0,
        ballots: [{ verdict: "yes", reason: "Reproduced it.", authorName: "Rin", voterId: "voter-1" }],
      },
    };
    show({ reportId: 7 });
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment" }));
    expect(await screen.findByText("No comments yet. Share what you found.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete vote" }));
    expect(await screen.findByText(/Bug · 0/)).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(2);
  });

  it("shows the team reply on a closed report and keeps the comment box only for admins", async () => {
    const closed: ForumDetail = { ...detail, status: "resolved", teamReply: "Released a fix for that." };
    mockApi(() => [200, closed]);
    show({ reportId: 7 });
    expect(await screen.findByRole("region", { name: "Team reply" })).toBeTruthy();
    expect(screen.getByText("Released a fix for that.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    cleanup();

    mockApi(() => [200, { ...closed, canModerate: true }]);
    show({ reportId: 7 });
    expect(await screen.findByRole("textbox")).toBeTruthy();
  });

  it("lets players upvote ideas from the list without coins or a reason", async () => {
    const idea = { ...item, summary: "Deck folders", upvotes: 3 };
    const fetchMock = mockApi((url, init) =>
      url.endsWith("/7/vote") && init?.method === "PUT"
        ? [200, { ...detail, ...idea, upvotes: 4, myVote: { verdict: "yes", reason: "" } }]
        : [200, page([idea])],
    );
    show({ board: "ideas" });
    const upvote = await screen.findByRole("button", { name: "Upvote Deck folders (3 upvotes)" });
    fireEvent.click(upvote);
    expect(await screen.findByRole("button", { name: "Upvote Deck folders (4 upvotes)", pressed: true })).toBeTruthy();
    expect(screen.queryByText("Aegis coins")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/feedback/ideas/7/vote"))).toBe(true);
  });

  it("says why an upvote failed instead of doing nothing", async () => {
    const idea = { ...item, summary: "Deck folders", upvotes: 3 };
    mockApi((url, init) =>
      url.endsWith("/7/vote") && init?.method === "PUT" ? [429, { error: "too_many_requests" }] : [200, page([idea])],
    );
    show({ board: "ideas" });
    fireEvent.click(await screen.findByRole("button", { name: "Upvote Deck folders (3 upvotes)" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Could not save. Try again.");
  });

  it("shows an upvote panel instead of a verdict on an idea", async () => {
    mockApi(() => [200, { ...detail, upvotes: 2 }]);
    show({ board: "ideas", reportId: 7 });
    expect(await screen.findByText("Want this?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Upvote .* \(2 upvotes\)/ })).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("button", { name: /All ideas/ })).toBeTruthy();
  });
});
