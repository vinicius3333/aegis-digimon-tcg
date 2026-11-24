import type {
  BugForumDetail,
  BugForumPage,
  BugForumState,
  BugForumSummary,
  BugForumVote,
} from "@aegis/shared/feedback/BugForum";
import { accountApi } from "@/account/client";
import { BugReportApiError } from "@/bugs/client";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${accountApi.base}/account/feedback/bugs${path}`, {
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

const sendJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const bugForumApi = {
  summary: (signal?: AbortSignal) => request<BugForumSummary>("/summary", { signal }),
  list: (state: BugForumState, before?: number, signal?: AbortSignal) =>
    request<BugForumPage>(`?state=${state}${before === undefined ? "" : `&before=${before}`}`, { signal }),
  read: (id: number, signal?: AbortSignal) => request<BugForumDetail>(`/${id}`, { signal }),
  vote: (id: number, vote: BugForumVote) => request<BugForumDetail>(`/${id}/vote`, sendJson("PUT", vote)),
  retract: (id: number) => request<BugForumDetail>(`/${id}/vote`, { method: "DELETE" }),
  comment: (id: number, body: string) => request<BugForumDetail>(`/${id}/comments`, sendJson("POST", { body })),
};
