import type { ForumDetail, ForumPage, ForumState, ForumSummary, ForumVote } from "@aegis/shared/feedback/Forum";
import type { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { accountApi } from "@/account/client";
import { BugReportApiError } from "@/bugs/client";

async function send(board: ForumBoard, path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${accountApi.base}/account/feedback/${board}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new BugReportApiError(response.status, body.error);
  }
  return response;
}

const json = async <T>(response: Promise<Response>): Promise<T> => (await response).json() as Promise<T>;

const body = (method: string, value: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});

export function forumApi(board: ForumBoard) {
  return {
    summary: (signal?: AbortSignal) => json<ForumSummary>(send(board, "/summary", { signal })),
    list: (state: ForumState, page: number, signal?: AbortSignal) =>
      json<ForumPage>(send(board, `?state=${state}&page=${page}`, { signal })),
    read: (id: number, signal?: AbortSignal) => json<ForumDetail>(send(board, `/${id}`, { signal })),
    vote: (id: number, vote: ForumVote) => json<ForumDetail>(send(board, `/${id}/vote`, body("PUT", vote))),
    retract: (id: number) => json<ForumDetail>(send(board, `/${id}/vote`, { method: "DELETE" })),
    comment: (id: number, text: string) =>
      json<ForumDetail>(send(board, `/${id}/comments`, body("POST", { body: text }))),
    removeComment: (id: number, commentId: number) =>
      json<ForumDetail>(send(board, `/${id}/comments/${commentId}`, { method: "DELETE" })),
    removeVote: (id: number, voterId: string) =>
      json<ForumDetail>(send(board, `/${id}/votes/${encodeURIComponent(voterId)}`, { method: "DELETE" })),
    replay: async (id: number) => (await send(board, `/${id}/replay`)).blob(),
  };
}

export type ForumApi = ReturnType<typeof forumApi>;
