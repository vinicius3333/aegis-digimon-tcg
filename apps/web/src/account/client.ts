import type { DeckListing } from "../game/decks";
import { dominantColor } from "../game/decks";
import type { DigimonWorldAvatarId } from "./avatars";

const apiBase = (import.meta.env.VITE_AEGIS_API_URL ?? `http://${location.hostname}:2567`).replace(/^ws/, "http");

export type RemoteAccount = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avatarId: DigimonWorldAvatarId | null;
  isAdmin: boolean;
};
export type AccountProfile = {
  account: RemoteAccount;
  stats: {
    rankedWins: number;
    rankedLosses: number;
    rankedDraws: number;
    rankedDodges: number;
    tournamentWins: number;
    tournamentLosses: number;
    tournamentDraws: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
  };
  decks: Array<{
    snapshotId: string;
    deckId: string | null;
    deckName: string;
    mainDeck: string[];
    eggDeck: string[];
    wins: number;
    losses: number;
    draws: number;
    matches: number;
  }>;
  matches: Array<{
    id: string;
    mode: "ranked" | "tournament";
    opponentName: string;
    result: "win" | "loss" | "draw";
    finishedAt: number;
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; availableAt?: number };
    throw new AccountApiError(response.status, body.error, body.availableAt);
  }
  return response.json() as Promise<T>;
}

export class AccountApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    readonly availableAt?: number,
  ) {
    super(code ?? String(status));
  }
}

export const accountApi = {
  base: apiBase,
  me: () => request<RemoteAccount | null>("/auth/me"),
  profile: () => request<AccountProfile>("/account/profile"),
  updateAvatar: (avatarId: DigimonWorldAvatarId) =>
    request<RemoteAccount>("/account/profile/avatar", { method: "PUT", body: JSON.stringify({ avatarId }) }),
  updateDisplayName: (displayName: string) =>
    request<RemoteAccount>("/account/profile/display-name", { method: "PUT", body: JSON.stringify({ displayName }) }),
  magicLink: (email: string) =>
    request<{ ok: true }>("/auth/magic-link", { method: "POST", body: JSON.stringify({ email }) }),
  logout: () => fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" }),
  decks: async (): Promise<DeckListing[]> =>
    (await request<Array<{ id: string; name: string; mainDeck: string[]; eggDeck: string[] }>>("/account/decks")).map(
      (deck) => ({ ...deck, color: dominantColor([...deck.mainDeck, ...deck.eggDeck]), blurb: "deck.blurbSaved" }),
    ),
  saveDeck: (deck: DeckListing) =>
    request(`/account/decks/${encodeURIComponent(deck.id)}`, {
      method: "PUT",
      body: JSON.stringify({ name: deck.name, mainDeck: deck.mainDeck, eggDeck: deck.eggDeck }),
    }),
};
