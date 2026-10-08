// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { FeedbackScreen } from "./FeedbackScreen";
import type { FeedbackRecord } from "./adminClient";

const item: FeedbackRecord = {
  id: 42,
  report: {
    kind: "bug",
    summary: "Effect did not activate",
    description: "<script>alert(1)</script>\nPlay Agumon",
    cardIds: ["BT1-010"],
    matchId: "match-id",
  },
  createdAt: 1780000000000,
  githubStatus: "failed",
  githubNumber: null,
  githubUrl: null,
};

function show(isAdmin = true) {
  return render(
    <I18nProvider>
      <FeedbackScreen isAdmin={isAdmin} />
    </I18nProvider>,
  );
}

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("administrator feedback inbox", () => {
  it("does not fetch reports for a non-admin, even on the direct screen", () => {
    const fetchMock = mockFetch({});
    show(false);
    expect(screen.getByText("Only administrators can view feedback.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads reports with their context, renders user content as text, and paginates", async () => {
    const fetchMock = mockFetch({ items: [item], nextBefore: 42 });
    show();
    expect(screen.getByRole("status").textContent).toContain("Loading");
    expect(await screen.findByRole("heading", { name: item.report.summary })).toBeTruthy();
    expect(screen.getByText("Anonymous player")).toBeTruthy();
    expect(screen.getByText("Copy failed; feedback saved")).toBeTruthy();
    expect(document.querySelector(".feedback-item script")).toBeNull();
    expect(screen.getByText("match-id")).toBeTruthy();
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "include", cache: "no-store" });

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], nextBefore: null })));
    fireEvent.click(screen.getByRole("button", { name: "Older" }));
    await waitFor(() => expect(fetchMock.mock.calls[1]![0]).toContain("?before=42"));
    expect(await screen.findByText("No feedback on this page.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Older" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Newer" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]![0]).not.toContain("?before");
  });

  it("allows retrying after a failed request", async () => {
    const fetchMock = mockFetch({}, 500);
    show();
    expect(await screen.findByText("Could not load feedback. Try refreshing.")).toBeTruthy();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], nextBefore: null })));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("No feedback on this page.")).toBeTruthy();
  });

  it.each([401, 403])("handles a server-side access rejection (%s)", async (status) => {
    mockFetch({}, status);
    show();
    expect(await screen.findByText("Only administrators can view feedback.")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("removes reports immediately when administrator permission disappears", async () => {
    mockFetch({ items: [item], nextBefore: null });
    const view = show();
    await screen.findByRole("heading", { name: item.report.summary });
    view.rerender(
      <I18nProvider>
        <FeedbackScreen isAdmin={false} />
      </I18nProvider>,
    );
    expect(screen.queryByRole("article")).toBeNull();
  });
});
