import { isSealedConfiguration } from "@aegis/shared/sealed/isSealedConfiguration";
import type { CreateTournamentInput } from "@aegis/shared/tournaments/index";

type Input = Pick<CreateTournamentInput, "structure" | "bestOf" | "topCut" | "allowBots" | "format"> & {
  sealedConfiguration?: unknown;
};

export function parseTournamentSettings({ structure, bestOf, topCut, allowBots, format, sealedConfiguration }: Input) {
  if (sealedConfiguration === undefined) return { structure, bestOf, topCutEnabled: topCut, allowBots, format };
  if (
    !isSealedConfiguration(sealedConfiguration) ||
    structure !== "swiss" ||
    bestOf !== 3 ||
    topCut ||
    allowBots ||
    (format !== undefined && format !== "standard")
  )
    return undefined;
  const { setId, packs, collationVersion, catalogVersion, rulesVersion, buildMinutes, sideboardSeconds } =
    sealedConfiguration;
  return {
    structure,
    bestOf,
    topCutEnabled: topCut,
    allowBots,
    format,
    sealedConfiguration: Object.freeze({
      setId,
      packs,
      collationVersion,
      catalogVersion,
      rulesVersion,
      buildMinutes,
      sideboardSeconds,
    }),
  } as const;
}
