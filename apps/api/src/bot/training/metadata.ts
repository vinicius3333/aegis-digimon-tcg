import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getCardDefinition, KEYWORDS } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { OBSERVED_STATUS_FIELDS } from "./observation.js";
import { TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";

/** Fingerprint executable engine/policy code and the scoped card rules, not just deck names. */
export function trainingMetadata() {
  const scope = TRAINING_DECK_VERSIONS.map(trainingDeck);
  const cardIds = [...new Set(scope.flatMap(({ deck }) => [...deck.mainDeck, ...deck.eggDeck]))].sort();
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const hash = createHash("sha256");
  const visit = (directory: string, base = root, prefix = "api"): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path, base, prefix);
      else if (entry.name.endsWith(".js") || entry.name.endsWith(".json"))
        hash
          .update(`${prefix}/${relative(base, path)}\0`)
          .update(readFileSync(path))
          .update("\0");
    }
  };
  for (const folder of ["engine", "cards", "bot"]) visit(join(root, folder));
  const sharedRoot = dirname(fileURLToPath(import.meta.resolve("@aegis/shared")));
  visit(sharedRoot, sharedRoot, "shared");
  hash.update(readFileSync(join(root, "../../../pnpm-lock.yaml")));
  hash.update(
    JSON.stringify(cardIds.map((id) => ({ definition: getCardDefinition(id), compiled: runtimeCompiledCard(id) }))),
  );
  return {
    schemaVersion: 3,
    statusFields: [...OBSERVED_STATUS_FIELDS],
    keywords: [...KEYWORDS],
    engineSha256: hash.digest("hex"),
    decks: scope.map(({ version, name, sha256 }) => ({ version, name, sha256 })),
    cardIds,
  };
}
