import { appOnlyReleaseDate } from "#shared/cards/appOnlySets";
import type { BanlistEntry } from "#shared/banlist";

export const alysionBanlist: Readonly<Record<string, BanlistEntry>> = {
  "BT2-047": {
    cardId: "BT2-047",
    name: "Argomon",
    status: "restricted",
    count: 1,
    effectiveDate: appOnlyReleaseDate,
  },
  "BT3-103": {
    cardId: "BT3-103",
    name: "Hidden Potential Discovered!",
    status: "restricted",
    count: 1,
    effectiveDate: appOnlyReleaseDate,
  },
};
