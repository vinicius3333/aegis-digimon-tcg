// @vitest-environment jsdom
import type { AccountNotification, NotificationPage } from "@aegis/shared";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { NotificationBell } from "./NotificationBell";
import { useNotificationInbox } from "./useNotificationInbox";

const resolved: AccountNotification = {
  id: 9,
  kind: "feedback_update",
  payload: {
    feedbackId: 412,
    summary: "Psychemon triggers twice",
    status: "resolved",
    previousStatus: "in_progress",
    replyExcerpt: "Fixed in 1.19.",
    bugConfirmed: true,
  },
  createdAt: Date.now() - 5 * 60_000,
  readAt: null,
};
const triaged: AccountNotification = {
  ...resolved,
  id: 8,
  payload: {
    ...resolved.payload,
    feedbackId: 400,
    summary: "Kapurimon",
    status: "triaged",
    replyExcerpt: null,
    bugConfirmed: false,
  },
  readAt: Date.now() - 1000,
};

type Reply = [status: number, body: unknown];

function mockApi(handler: (url: string, init?: RequestInit) => Reply) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const [status, body] = handler(String(input), init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function Harness({ accountId, onOpenFeedback }: { accountId?: string; onOpenFeedback: (id?: number) => void }) {
  const inbox = useNotificationInbox(accountId);
  return (
    <I18nProvider>
      <NotificationBell inbox={inbox} onOpenFeedback={onOpenFeedback} />
    </I18nProvider>
  );
}

const unreadCalls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/notifications/unread-count")).length;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => setVisibility("visible"));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("notification bell", () => {
  it("does nothing for a guest", () => {
    const fetchMock = mockApi(() => [200, {}]);
    render(<Harness onOpenFeedback={vi.fn<(feedbackId?: number) => void>()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
  });

  it("shows the unread count and refreshes it only while the tab is visible", async () => {
    let unread = 2;
    const fetchMock = mockApi(() => [200, { unread }]);
    render(<Harness accountId="kai" onOpenFeedback={vi.fn<(feedbackId?: number) => void>()} />);
    expect(await screen.findByRole("button", { name: "Notifications, 2 unread" })).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    setVisibility("hidden");
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(unreadCalls(fetchMock)).toBe(1);

    unread = 12;
    setVisibility("visible");
    expect(await screen.findByText("9+")).toBeTruthy();
    expect(unreadCalls(fetchMock)).toBe(2);
  });

  it("stops polling once the session is gone", async () => {
    const fetchMock = mockApi(() => [401, { error: "authentication_required" }]);
    render(<Harness accountId="kai" onOpenFeedback={vi.fn<(feedbackId?: number) => void>()} />);
    await waitFor(() => expect(unreadCalls(fetchMock)).toBe(1));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await Promise.resolve();
    expect(unreadCalls(fetchMock)).toBe(1);
  });

  it("opens the list, marks a notification read and opens its report", async () => {
    const onOpenFeedback = vi.fn<(feedbackId?: number) => void>();
    const fetchMock = mockApi((url, init) => {
      if (url.endsWith("/notifications/unread-count")) return [200, { unread: 1 }];
      if (url.endsWith("/notifications/read")) return [200, { unread: 0 }];
      const page: NotificationPage = { items: [resolved, triaged], nextBefore: null, unread: 1 };
      return [init?.method ? 405 : 200, page];
    });
    render(<Harness accountId="kai" onOpenFeedback={onOpenFeedback} />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));

    const panel = await screen.findByRole("region", { name: "Notifications" });
    const item = await within(panel).findByRole("button", { name: /Psychemon triggers twice.*was resolved/ });
    expect(within(item).getByText("Fixed in 1.19.")).toBeTruthy();
    expect(within(item).getByText("Confirmed as a bug · +1 point")).toBeTruthy();
    expect(within(panel).getByRole("button", { name: /Kapurimon.*was triaged/ })).toBeTruthy();

    fireEvent.click(item);
    expect(onOpenFeedback).toHaveBeenCalledWith(412);
    const markRead = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/notifications/read"))!;
    expect(JSON.parse(String(markRead[1]!.body))).toEqual({ ids: [9] });
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });

  it("marks everything read and links to the feedback page", async () => {
    const onOpenFeedback = vi.fn<(feedbackId?: number) => void>();
    const fetchMock = mockApi((url) => {
      if (url.endsWith("/notifications/unread-count")) return [200, { unread: 1 }];
      if (url.endsWith("/notifications/read")) return [200, { unread: 0 }];
      return [200, { items: [resolved], nextBefore: null, unread: 1 }];
    });
    render(<Harness accountId="kai" onOpenFeedback={onOpenFeedback} />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark all as read" }));
    await screen.findByRole("button", { name: "Notifications" });
    const markRead = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/notifications/read"))!;
    expect(JSON.parse(String(markRead[1]!.body))).toEqual({ all: true });

    fireEvent.click(screen.getByRole("button", { name: "View all my feedback" }));
    expect(onOpenFeedback).toHaveBeenCalledWith();
  });

  it("closes on Escape and returns focus to the bell", async () => {
    mockApi((url) => [200, url.endsWith("unread-count") ? { unread: 0 } : { items: [], nextBefore: null, unread: 0 }]);
    render(<Harness accountId="kai" onOpenFeedback={vi.fn<(feedbackId?: number) => void>()} />);
    const bell = screen.getByRole("button", { name: "Notifications" });
    fireEvent.click(bell);
    expect(await screen.findByText("Nothing new. Updates on your feedback appear here.")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
    expect(document.activeElement).toBe(bell);
  });
});
