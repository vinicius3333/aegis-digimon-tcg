import type {
  CommunityDeck,
  CommunityDeckPage,
  CommunityLikeResult,
  CommunityPeriod,
  CommunityPublication,
  CommunitySort,
} from "@aegis/shared";
import { AccountApiError, accountApi, request } from "../account/client";

export type CommunityBrowseQuery = {
  sort: CommunitySort;
  period: CommunityPeriod;
  colors: readonly string[];
  search: string;
  page: number;
};

/** For the endpoints that answer 204 with no body, which the JSON helper cannot parse. */
async function send(path: string, method: string): Promise<void> {
  const response = await fetch(`${accountApi.base}${path}`, { method, credentials: "include" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new AccountApiError(response.status, body.error);
  }
}

export const communityApi = {
  browse: (query: CommunityBrowseQuery) => {
    const params = new URLSearchParams({ sort: query.sort, period: query.period, page: String(query.page) });
    if (query.search.trim()) params.set("q", query.search.trim());
    if (query.colors.length > 0) params.set("colors", query.colors.join(","));
    return request<CommunityDeckPage>(`/community/decks?${params}`);
  },
  deck: (id: string) => request<CommunityDeck>(`/community/decks/${encodeURIComponent(id)}`),
  setLike: (id: string, liked: boolean) =>
    request<CommunityLikeResult>(`/community/decks/${encodeURIComponent(id)}/like`, {
      method: liked ? "PUT" : "DELETE",
    }),
  recordCopy: (id: string) => send(`/community/decks/${encodeURIComponent(id)}/copies`, "POST"),
  publications: () => request<CommunityPublication[]>("/community/publications"),
  publish: (deckId: string) =>
    request<CommunityPublication>(`/community/publications/${encodeURIComponent(deckId)}`, { method: "PUT" }),
  unpublish: (deckId: string) => send(`/community/publications/${encodeURIComponent(deckId)}`, "DELETE"),
};
