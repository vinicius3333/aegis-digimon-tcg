import { getCardDefinition } from "@aegis/shared";
import { matchNameOrTrait, runtimeCompiledCard } from "../effects/interpreter.js";

type NameOrTraitRef = Parameters<typeof matchNameOrTrait>[1];

/**
 * Probe cards for a printed bare `[X Antibody]` reference, which names the card, not the trait.
 * BT9-109 is the X Antibody Option; EX11-053 and EX5-070 carry "[Rule] Name: Also treated as
 * [X Antibody]" (Q3679, Q5907). BT9-014 and EX8-015 are WarGrowlmon (X Antibody): they have the
 * X Antibody trait and the substring in their names, yet are not named [X Antibody].
 */
export const X_ANTIBODY_NAME_PROBES = {
  "BT9-109": true,
  "EX11-053": true,
  "EX5-070": true,
  "BT9-014": false,
  "EX8-015": false,
} as const;

type ProbeId = keyof typeof X_ANTIBODY_NAME_PROBES;

function collectXAntibodyReferences(node: unknown, found: NameOrTraitRef[]): void {
  if (Array.isArray(node)) {
    for (const entry of node) collectXAntibodyReferences(entry, found);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (
    Array.isArray(record.tokens) &&
    record.tokens.includes("X Antibody") &&
    typeof record.match === "string" &&
    record.negate !== true
  ) {
    found.push(record as unknown as NameOrTraitRef);
  }
  for (const value of Object.values(record)) collectXAntibodyReferences(value, found);
}

/**
 * For each probe card, whether every `[X Antibody]` reference in the card's registered IR
 * accepts it. Throws when the card has no such reference, so a test cannot pass vacuously.
 */
export function xAntibodyNameGateVerdicts(cardId: string): Record<ProbeId, boolean | "mixed"> {
  const references: NameOrTraitRef[] = [];
  collectXAntibodyReferences(runtimeCompiledCard(cardId), references);
  if (references.length === 0) throw new Error(`${cardId} registers no [X Antibody] reference`);
  const verdicts = {} as Record<ProbeId, boolean | "mixed">;
  for (const probeId of Object.keys(X_ANTIBODY_NAME_PROBES) as ProbeId[]) {
    const definition = getCardDefinition(probeId)!;
    const results = new Set(references.map((reference) => matchNameOrTrait(definition, reference)));
    verdicts[probeId] = results.size > 1 ? "mixed" : results.has(true);
  }
  return verdicts;
}
