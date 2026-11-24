// @vitest-environment jsdom
import type { BugForumDetail, BugForumItem } from "@aegis/shared/feedback/BugForum";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { BugForumScreen } from "@/bugs/BugForumScreen";

const item: BugForumItem = {
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
};
const detail: BugForumDetail = {
  ...item,
  comments: [{ id: 1, authorName: "Mika", body: "Only with exactly four cards.", createdAt: Date.now() }],
  tally: null,
};

function mockApi(handler: (url: string, init?: RequestInit) => [number, unknown]) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const [status, body] = handler(String(input), init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(props: { signedIn?: boolean; bugId?: number } = {}) {
  const callbacks = { onSignIn: vi.fn<() => void>(), onOpen: vi.fn<(id?: number) => void>() };
  render(
    <I18nProvider>
      <BugForumScreen
        signedIn={props.signedIn ?? true}
        bugId={props.bugId}
        metaAvailable={false}
        onSectionChange={vi.fn()}
        {...callbacks}
      />
    </I18nProvider>,
  );
  return callbacks;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BugForumScreen", () => {
  it("asks guests to sign in", () => {
    mockApi(() => [200, {}]);
    const { onSignIn } = show({ signedIn: false });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("lists open reports, shows the coin balance and opens a thread", async () => {
    mockApi((url) =>
      url.includes("/summary")
        ? [200, { open: 1, awaitingVote: 1, aegisCoins: 5 }]
        : [200, { items: [item], nextBefore: null }],
    );
    const { onOpen } = show();
    fireEvent.click(await screen.findByRole("link", { name: "Dianamon skips the DNA prompt" }));
    expect(onOpen).toHaveBeenCalledWith(7);
    expect(await screen.findByText("5")).toBeTruthy();
    expect(screen.getByText("Vote")).toBeTruthy();
  });

  it("casts a vote with a reason and keeps the tally hidden", async () => {
    const fetchMock = mockApi((url, init) => {
      if (url.includes("/summary")) return [200, { open: 1, awaitingVote: 0, aegisCoins: 0 }];
      if (url.endsWith("/7/vote") && init?.method === "PUT")
        return [200, { ...detail, myVote: { verdict: "bug", reason: "The card says may, so it must ask." } }];
      return [200, detail];
    });
    show({ bugId: 7 });

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
      verdict: "bug",
      reason: "The card says may, so it must ask.",
    });
  });

  it("shows the decision, the split and everyone's reasons once a report is closed", async () => {
    mockApi((url) =>
      url.includes("/summary")
        ? [200, { open: 0, awaitingVote: 0, aegisCoins: 1 }]
        : [
            200,
            {
              ...detail,
              status: "wont_fix",
              outcome: "not_bug",
              myVote: { verdict: "not_bug", reason: "One icon is your own deck." },
              tally: {
                bug: 1,
                notBug: 2,
                ballots: [{ verdict: "not_bug", reason: "One icon is your own deck.", authorName: "Rin" }],
              },
            },
          ],
    );
    show({ bugId: 7 });
    expect(await screen.findByText("The team decided")).toBeTruthy();
    expect(screen.getByText("Your vote matched. You earned 1 Aegis coin.")).toBeTruthy();
    expect(screen.getByText("One icon is your own deck.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cast vote" })).toBeNull();
  });
});
