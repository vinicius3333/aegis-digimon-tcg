import { getRankedConnectionError } from "@/ranked/getRankedConnectionError";
/* What the board says while there is no match to show: reconnecting, a connection that
   failed, and the wait for a second player.

   The wait reads differently for each way in — a bot that has not sat down yet, a
   private room whose code is still being shared, a guest connecting to one, and the
   open queue — so the mode picks both lines. */

import type { StartMode } from "../../../screens/Lobby";
import type { Translate } from "../../../i18n";
import { ConnectionErrorCode } from "@aegis/shared/protocol/ConnectionErrorCode";
import { getConnectionErrorMessage } from "@/net/getConnectionErrorMessage";

export interface PendingMatchNotice {
  title: string;
  detail: string;
  spinner: boolean;
  actionLabel?: string;
  /** Present only for the private host, whose guest still needs the code. */
  roomCode?: string;
  /** The screen the action returns to, when the notice offers one. */
  exitTo?: "lobby";
}

export function pendingMatchNotice({
  status,
  botError,
  error,
  vsBot,
  spectating = false,
  hasOpponent = false,
  startMode,
  hostRoomCode,
  joinOptions,
  t,
}: {
  status: string;
  botError: string | undefined;
  error: string | undefined;
  vsBot: boolean;
  spectating?: boolean;
  hasOpponent?: boolean;
  startMode: StartMode;
  hostRoomCode: string | undefined;
  joinOptions: { displayName: string; tournamentGameId?: string };
  t: Translate;
}): PendingMatchNotice {
  if (status === "reconnecting") {
    return {
      title: t("game.reconnecting"),
      detail:
        error === ConnectionErrorCode.MESSAGE_TOO_LARGE.value
          ? t("game.messageTooLargeReconnecting")
          : t("game.reconnectingDetail"),
      spinner: true,
    };
  }
  if (status === "error" || status === "closed" || botError) {
    return {
      title: botError ? t("game.botConnectionFailed") : t("game.connectionLost"),
      detail:
        (!botError && getRankedConnectionError({ error, t })) ||
        getConnectionErrorMessage({ error: botError ?? error, t }),
      spinner: false,
      actionLabel: t("game.returnToLobby"),
      exitTo: "lobby",
    };
  }
  if (spectating) {
    return { title: t("game.waitingSpectate"), detail: t("game.spectateDetail"), spinner: true };
  }
  if (startMode === "ranked") {
    return {
      title: t("ranked.season.searching"),
      detail: t("ranked.season.searchHelp"),
      spinner: true,
      actionLabel: t("ranked.season.cancel"),
      exitTo: "lobby",
    };
  }
  if (joinOptions.tournamentGameId) {
    return { title: t("game.waitingOpponent"), detail: t("tournaments.play.waitingGame"), spinner: true };
  }
  const canCancelSearch = !hasOpponent && !vsBot && ["casual", "ranked", "unlimited", "beta"].includes(startMode);
  return {
    title: vsBot
      ? t("game.waitingBot")
      : startMode === "private_host"
        ? t("game.waitingOpponent")
        : startMode === "private_guest"
          ? t("game.waitingJoinPrivate")
          : t("game.waitingFinding"),
    detail: vsBot
      ? t("game.waitingBotDetail")
      : startMode === "private_host"
        ? hostRoomCode
          ? t("game.shareCode", { code: hostRoomCode })
          : t("game.creatingRoom")
        : startMode === "private_guest"
          ? t("game.connectingPrivate")
          : t("game.queuedDetail", { name: joinOptions.displayName }),
    spinner: true,
    actionLabel: canCancelSearch ? t("game.cancelSearch") : undefined,
    exitTo: canCancelSearch ? "lobby" : undefined,
    roomCode: startMode === "private_host" ? hostRoomCode : undefined,
  };
}
