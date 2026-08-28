import type { Migration } from "../migrator.js";
import { initialSchema } from "./001-initial-schema.js";
import { tournamentProgramColumns } from "./002-tournament-program-columns.js";
import { tournamentRulesAndBanlist } from "./003-tournament-rules-and-banlist.js";
import { tournamentParticipants } from "./004-tournament-participants.js";
import { matchSeriesAndGames } from "./005-match-series-and-games.js";
import { phasesAndRounds } from "./006-phases-and-rounds.js";
import { deadlineScheduler } from "./007-deadline-scheduler.js";
import { botParticipants } from "./008-bot-participants.js";
import { topCut } from "./009-top-cut.js";
import { tournamentEvents } from "./010-tournament-events.js";
import { gameDeckSnapshots } from "./011-game-deck-snapshots.js";
import { accountAvatar } from "./012-account-avatar.js";
import { accountAdmin } from "./013-account-admin.js";
import { accountDisplayNameChange } from "./014-account-display-name-change.js";

export const migrations: readonly Migration[] = [
  initialSchema,
  tournamentProgramColumns,
  tournamentRulesAndBanlist,
  tournamentParticipants,
  matchSeriesAndGames,
  phasesAndRounds,
  deadlineScheduler,
  botParticipants,
  topCut,
  tournamentEvents,
  gameDeckSnapshots,
  accountAvatar,
  accountAdmin,
  accountDisplayNameChange,
];
