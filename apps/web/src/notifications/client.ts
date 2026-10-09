import type { NotificationPage } from "@aegis/shared";
import { accountApi } from "../account/client";

export class NotificationApiError extends Error {
  constructor(readonly status: number) {
    super(String(status));
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${accountApi.base}${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw new NotificationApiError(response.status);
  return response.json() as Promise<T>;
}

export const notificationApi = {
  unreadCount: async (signal?: AbortSignal): Promise<number> =>
    (await request<{ unread: number }>("/notifications/unread-count", { signal })).unread,

  list: (before?: number, signal?: AbortSignal): Promise<NotificationPage> =>
    request(`/notifications${before === undefined ? "" : `?before=${before}`}`, { signal }),

  markRead: async (ids: readonly number[] | "all"): Promise<number> =>
    (
      await request<{ unread: number }>("/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids === "all" ? { all: true } : { ids }),
      })
    ).unread,
};
