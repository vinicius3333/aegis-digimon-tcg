import type { SealedConfiguration } from "#shared/sealed/SealedContracts";
import type { CreateTournamentInput, ParticipantView, TournamentSummary } from "#shared/tournaments/index";

export type TournamentCreation = CreateTournamentInput & { sealedConfiguration?: SealedConfiguration };
export type TournamentParticipant = ParticipantView & { sealedReady?: boolean };
export type TournamentOverview = TournamentSummary & {
  sealedConfiguration?: SealedConfiguration | null;
  sealedBuildDeadlineAt?: number | null;
};
