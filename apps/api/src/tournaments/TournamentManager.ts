import type { CreateTournamentInput, TournamentSummary, TournamentView } from "@aegis/shared";

// Deep-module boundary for the tournament domain (see
// the corresponding regression coverage).
// AegisRoom stays a thin adapter: it validates a GameAuthorization, runs one
// game, and reports an AuthoritativeGameResult. It never advances brackets.

export type Viewer =
  | { kind: "public" }
  | { kind: "participant"; accountId: string }
  | { kind: "organizer"; accountId: string };

export type TournamentCommand =
  | { kind: "create"; actorAccountId: string; input: CreateTournamentInput }
  | { kind: "register"; tournamentId: string; accountId: string; savedDeckId: string }
  | { kind: "check_in"; tournamentId: string; accountId: string }
  | { kind: "drop"; tournamentId: string; accountId: string }
  | { kind: "close_check_in"; tournamentId: string; actorAccountId: string }
  | { kind: "mark_present"; matchId: string; accountId: string }
  | { kind: "cancel"; tournamentId: string; actorAccountId: string; reason: string };

export type ClaimTournamentGame = {
  gameId: string;
  authorizationToken: string;
  roomId: string;
};

export type GameAuthorization = {
  gameId: string;
  seriesId: string;
  matchId: string;
  tournamentId: string;
  gameIndex: number;
  participantAccountIds: readonly (string | null)[];
  /** The participant row behind each seat. The only identity a bot seat has, since it has no Account. */
  participantIds: readonly (string | null)[];
  token: string;
  expiresAt: number;
};

/**
 * A winner is named by Account when a person won and by participant when a bot did — a bot has no
 * Account, and inventing one for it would put a non-person in the accounts table and in every
 * competitive statistic keyed off it.
 */
export type AuthoritativeGameResult = {
  gameId: string;
  roomId: string;
  outcome:
    | { kind: "winner"; winnerAccountId: string }
    | { kind: "winnerParticipant"; winnerParticipantId: string }
    | { kind: "draw" }
    | { kind: "voided"; reason: string };
  finishedAt: number;
};

export interface TournamentManager {
  execute(command: TournamentCommand): Promise<TournamentView>;
  getTournament(id: string, viewer: Viewer): Promise<TournamentView | undefined>;
  listTournaments(viewer: Viewer): Promise<TournamentSummary[]>;
  claimGame(input: ClaimTournamentGame): Promise<GameAuthorization>;
  recordGameResult(input: AuthoritativeGameResult): Promise<void>;
  processDueDeadlines(now: number): Promise<number>;
}
