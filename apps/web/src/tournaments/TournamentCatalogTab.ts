export const TournamentCatalogTab = {
  UPCOMING: { name: "UPCOMING", value: "upcoming", labelKey: "tournaments.catalog.upcoming" },
  MINE: { name: "MINE", value: "mine", labelKey: "tournaments.catalog.mine" },
  FINISHED: { name: "FINISHED", value: "finished", labelKey: "tournaments.catalog.finished" },
} as const;

export type TournamentCatalogTab = (typeof TournamentCatalogTab)[keyof typeof TournamentCatalogTab]["value"];
