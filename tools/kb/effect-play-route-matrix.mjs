import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const ROUTE_SCOPE = "effect-play-routes";
export const CATALOG_PATH = "packages/shared/src/cards/data/cards.json";
export const MECHANICS = ["assembly", "digixros", "dna", "app-fusion", "burst", "alternate-digivolution"];
export const ROUTES = ["manual-hand", "effect-hand", "effect-trash", "effect-security", "effect-deck-reveal"];

export function routeRuleId(mechanic, route) {
  const rules = {
    assembly: ["7-3-3-3", "7-3-2-10"],
    digixros: ["7-2-3-3", "7-2-2-13"],
    dna: ["8-2-1", "8-2-2-4"],
    "app-fusion": ["8-4-1", "8-4-2-2"],
    burst: ["8-3-1", "8-3-2-2"],
    "alternate-digivolution": ["2-3-5-3", "2-3-5-3"],
  };
  const section = rules[mechanic]?.[route === "manual-hand" ? 0 : 1];
  return section ? `comprehensive:${section}` : undefined;
}

export function catalogFingerprint(root) {
  return createHash("sha256")
    .update(readFileSync(resolve(root, CATALOG_PATH)))
    .digest("hex");
}

/** Keep all 30 route cells visible, including reviewed absences of printed providers. */
export function validateRouteMatrix(inventory, root) {
  const matrix = inventory.effectPlayRouteMatrix;
  if (!matrix && !inventory.scenarioScopes?.[ROUTE_SCOPE]) return [];
  const errors = [];
  if (!matrix || !Array.isArray(matrix.cells)) return ["Effect-play route matrix is missing"];
  if (matrix.sourceIndexSha256 !== inventory.source.indexSha256)
    errors.push("Effect-play route matrix rules changed; review route classifications again");
  if (matrix.catalogSha256 !== catalogFingerprint(root))
    errors.push("Effect-play route matrix catalog changed; review providers and exclusions again");
  const records = new Map(inventory.obligations.map((record) => [record.id, record]));
  const catalogIds = new Set(JSON.parse(readFileSync(resolve(root, CATALOG_PATH), "utf8")).map((card) => card.cardId));
  const scenarios = new Map(
    inventory.obligations
      .filter((record) => record.scope === ROUTE_SCOPE)
      .flatMap((record) => (record.scenarios ?? []).map((scenario) => [scenario.id, scenario])),
  );
  const seen = new Set();
  for (const cell of matrix.cells) {
    if (!cell || typeof cell !== "object") {
      errors.push("Invalid route cell");
      continue;
    }
    const key = `${cell.mechanic}/${cell.route}`;
    if (!MECHANICS.includes(cell.mechanic) || !ROUTES.includes(cell.route)) errors.push(`Unknown route cell: ${key}`);
    if (seen.has(key)) errors.push(`Duplicate route cell: ${key}`);
    seen.add(key);
    if (
      !Array.isArray(cell.ruleIds) ||
      !cell.ruleIds.includes(routeRuleId(cell.mechanic, cell.route)) ||
      cell.ruleIds.some((id) => !records.has(id))
    )
      errors.push(`Route cell lacks existing rule references: ${key}`);
    if (cell.status === "covered") {
      if (
        !Array.isArray(cell.scenarioIds) ||
        !cell.scenarioIds.length ||
        !cell.scenarioIds.includes(`${ROUTE_SCOPE}:${cell.mechanic}:${cell.route}`) ||
        cell.scenarioIds.some((id) => scenarios.get(id)?.status !== "proven")
      )
        errors.push(`Route cell lacks proven scenarios in ${ROUTE_SCOPE}: ${key}`);
      if (cell.reason !== null) errors.push(`Covered route cell must have null reason: ${key}`);
    } else if (cell.status === "no-printed-provider") {
      if (typeof cell.reason !== "string" || !cell.reason.trim())
        errors.push(`Route exclusion lacks review reason: ${key}`);
      if (!Array.isArray(cell.scenarioIds) || cell.scenarioIds.length)
        errors.push(`Route exclusion cannot claim executed scenarios: ${key}`);
      const review = cell.catalogReview;
      if (
        !review ||
        typeof review.search !== "string" ||
        !review.search.trim() ||
        typeof review.conclusion !== "string" ||
        !review.conclusion.trim() ||
        !Array.isArray(review.candidateCardIds) ||
        review.candidateCardIds.some((id) => !catalogIds.has(id))
      )
        errors.push(`Route exclusion lacks catalog review with existing candidate IDs: ${key}`);
    } else errors.push(`Unreviewed route cell: ${key}`);
  }
  for (const mechanic of MECHANICS)
    for (const route of ROUTES)
      if (!seen.has(`${mechanic}/${route}`)) errors.push(`Missing route cell: ${mechanic}/${route}`);
  return errors;
}
