import { useCallback } from "react";
import { tournamentApi } from "@/tournaments/client";
import { SealedPoolBuilder } from "@/sealed/SealedPoolBuilder";
import type { PrivateSealedReady } from "@aegis/shared/sealed/private/PrivateSealedContracts";
type Props = { tournamentId: string; onReady: () => void };
export function SealedBuilder({ tournamentId, onReady }: Props) {
  const loadPool = useCallback((signal: AbortSignal) => tournamentApi.sealedPool(tournamentId, signal), [tournamentId]);
  const readyDeck = useCallback(
    (input: PrivateSealedReady) => tournamentApi.sealedReady(tournamentId, input),
    [tournamentId],
  );
  return <SealedPoolBuilder loadPool={loadPool} readyDeck={readyDeck} onReady={onReady} />;
}
