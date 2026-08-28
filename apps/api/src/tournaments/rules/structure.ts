import { swissRoundCount, topCutSize, type CreateTournamentInput } from "@aegis/shared";

/**
 * The Swiss round count and Top Cut size computed from the official tables and frozen on the
 * tournament. Both are `null` for a structure that has no such phase, so a stored `null` means
 * "not applicable" and a stored `0` means "the flag was on but the field is too small to cut".
 */
export type FrozenStructure = {
  swissRounds: number | null;
  topCutSize: number | null;
};

export type FreezeStructureInput = Pick<CreateTournamentInput, "structure" | "topCut">;

/**
 * Pure: the same confirmed field always freezes the same shape. Called once when check-in closes
 * (that trigger is not part of this slice); late entry, drop and disqualification afterwards never
 * resize either number.
 */
export function freezeStructure(confirmedParticipants: number, input: FreezeStructureInput): FrozenStructure {
  const participants = Math.max(0, Math.trunc(confirmedParticipants));
  if (input.structure !== "swiss") return { swissRounds: null, topCutSize: null };
  return {
    swissRounds: swissRoundCount(participants),
    topCutSize: input.topCut ? topCutSize(participants) : null,
  };
}

/**
 * What the creation form shows before anyone has registered: the cut the current field would
 * produce. `null` means no cut applies at all — a plain bracket, or the flag switched off — while
 * `0` means the flag is on but the field is too small to cut. Only `0` should raise the UI warning;
 * warning on a plain bracket would be nonsense.
 */
export function estimatedTopCutSize(confirmedParticipants: number, input: FreezeStructureInput): number | null {
  return freezeStructure(confirmedParticipants, input).topCutSize;
}
