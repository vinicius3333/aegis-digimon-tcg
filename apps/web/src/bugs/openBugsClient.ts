import type { OpenBugDetail, OpenBugPage } from "@aegis/shared/feedback/OpenBug";
import { accountApi } from "@/account/client";
import { BugReportApiError } from "@/bugs/client";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${accountApi.base}/account/feedback/open-bugs${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new BugReportApiError(response.status, body.error);
  }
  return response.json() as Promise<T>;
}

export const openBugsApi = {
  list: (before?: number, signal?: AbortSignal) =>
    request<OpenBugPage>(before === undefined ? "" : `?before=${before}`, { signal }),
  read: (id: number, signal?: AbortSignal) => request<OpenBugDetail>(`/${id}`, { signal }),
  claim: (id: number) => request<OpenBugDetail>(`/${id}/claim`, { method: "PUT" }),
  release: (id: number) => request<OpenBugDetail>(`/${id}/claim`, { method: "DELETE" }),
  addNote: (id: number, body: string) =>
    request<OpenBugDetail>(`/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),
};
