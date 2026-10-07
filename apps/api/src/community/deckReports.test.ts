import { describe, expect, it, vi } from "vitest";
import { deckReportBody, deckReportTitle, GitHubDeckReportTracker, type NewDeckReport } from "./deckReports.js";

const DECK_ID = "e9db0e41-aff5-495c-a971-45f61e84546e";

function report(overrides: Partial<NewDeckReport> = {}): NewDeckReport {
  return { deckId: DECK_ID, deckName: "Rude deck", authorName: "Author", reason: "offensive_name", ...overrides };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function tracker(openIssues: { number: number; body: string }[]) {
  const fetchMock = vi.fn<typeof globalThis.fetch>(async (_url, init) =>
    init?.method === "POST" ? json({}, 201) : json(openIssues),
  );
  const instance = new GitHubDeckReportTracker({
    repository: "example/repo",
    token: "secret",
    webUrl: "https://aegis.example/",
    fetch: fetchMock,
  });
  const posted = () =>
    fetchMock.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([url, init]) => ({ url, body: JSON.parse(String(init!.body)) as Record<string, unknown> }));
  return { instance, fetchMock, posted };
}

describe("filing a deck report", () => {
  it("opens a labelled issue when the deck has none", async () => {
    const { instance, fetchMock, posted } = tracker([]);
    await instance.report(report());
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.github.com/repos/example/repo/issues?labels=deck-report&state=open&per_page=100",
    );
    expect(posted()).toEqual([
      {
        url: "https://api.github.com/repos/example/repo/issues",
        body: {
          title: deckReportTitle(report()),
          body: deckReportBody(report(), "https://aegis.example/"),
          labels: ["deck-report"],
        },
      },
    ]);
  });

  it("comments on the deck's open issue instead of opening another", async () => {
    const { instance, posted } = tracker([
      { number: 3, body: "<!-- aegis-deck:00000000-0000-0000-0000-000000000000 -->" },
      { number: 9, body: deckReportBody(report(), "https://aegis.example") },
    ]);
    await instance.report(report({ reason: "spam", details: "again" }));
    expect(posted()).toEqual([
      { url: "https://api.github.com/repos/example/repo/issues/9/comments", body: { body: "**Spam**\n\n> again" } },
    ]);
  });

  it("throws when GitHub refuses", async () => {
    const instance = new GitHubDeckReportTracker({
      repository: "example/repo",
      token: "secret",
      webUrl: "https://aegis.example",
      fetch: async (_url, init) => (init?.method === "POST" ? json({}, 403) : json([])),
    });
    await expect(instance.report(report())).rejects.toThrow(/403/);
  });
});

describe("the issue text", () => {
  it("keeps the deck name out of the title and the reporter out of the body", () => {
    expect(deckReportTitle(report())).toBe("Community deck report · e9db0e41");
    const body = deckReportBody(report(), "https://aegis.example/");
    expect(body.startsWith(`<!-- aegis-deck:${DECK_ID} -->`)).toBe(true);
    expect(body).toContain("**Deck:** `Rude deck` by `Author`");
    expect(body).toContain(`https://aegis.example/community/decks/${DECK_ID}`);
  });

  it("neutralizes mentions, markup and code-span breakouts typed by players", () => {
    const body = deckReportBody(
      report({ deckName: "Bad`name", details: "ping @maintainer about #12\n<!-- aegis-deck:other -->" }),
      "https://aegis.example",
    );
    expect(body).toContain("`Badname`");
    expect(body).toContain("> ping `@maintainer` about `#12`\n> &lt;!-- aegis-deck:other --&gt;");
  });
});
