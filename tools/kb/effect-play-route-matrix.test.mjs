import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CATALOG_PATH,
  MECHANICS,
  ROUTES,
  ROUTE_SCOPE,
  catalogFingerprint,
  routeRuleId,
  validateRouteMatrix,
} from "./effect-play-route-matrix.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
function fixture() {
  const cells = MECHANICS.flatMap((mechanic) =>
    ROUTES.map((route) => ({
      mechanic,
      route,
      status: "covered",
      ruleIds: [routeRuleId(mechanic, route)],
      scenarioIds: [`${ROUTE_SCOPE}:${mechanic}:${route}`],
      reason: null,
    })),
  );
  const ruleIds = [...new Set(cells.flatMap((cell) => cell.ruleIds))];
  return {
    source: { indexSha256: "reviewed-rules" },
    scenarioScopes: { [ROUTE_SCOPE]: ruleIds },
    obligations: ruleIds.map((id) => ({
      id,
      scope: ROUTE_SCOPE,
      scenarios: cells
        .filter((cell) => cell.ruleIds.includes(id))
        .map((cell) => ({ id: cell.scenarioIds[0], status: "proven" })),
    })),
    effectPlayRouteMatrix: {
      catalogSha256: catalogFingerprint(root),
      sourceIndexSha256: "reviewed-rules",
      cells,
    },
  };
}

test("requires all thirty cells and rejects duplicate or invented routes", () => {
  const inventory = fixture();
  assert.deepEqual(validateRouteMatrix(inventory, root), []);
  inventory.effectPlayRouteMatrix.cells.pop();
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /Missing route cell/);
  inventory.effectPlayRouteMatrix.cells.push(inventory.effectPlayRouteMatrix.cells[0]);
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /Duplicate route cell/);
  inventory.effectPlayRouteMatrix.cells.push({ mechanic: "invented", route: "manual-hand" });
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /Unknown route cell/);
});

test("requires executable evidence in the selected scope instead of a merely existing scenario", () => {
  const inventory = fixture();
  inventory.obligations[0].scenarios[0].status = "gap";
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /lacks proven scenarios/);
  inventory.obligations[0].scenarios[0].status = "proven";
  inventory.obligations[0].scope = "other";
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /lacks proven scenarios/);
});

test("catalog and rules drift invalidate reviewed exclusions without inventing runtime proof", () => {
  const inventory = fixture();
  const cell = inventory.effectPlayRouteMatrix.cells.find(
    (entry) => entry.mechanic === "app-fusion" && entry.route === "effect-security",
  );
  Object.assign(cell, {
    status: "no-printed-provider",
    scenarioIds: [],
    reason: `Reviewed printed effects in ${CATALOG_PATH}; no provider for this combination.`,
    catalogReview: {
      search: "security play providers",
      candidateCardIds: ["BT24-087"],
      conclusion: "App Fusion providers target hand or trash, not security.",
    },
  });
  assert.deepEqual(validateRouteMatrix(inventory, root), []);
  cell.catalogReview.candidateCardIds = ["invented-card"];
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /existing candidate IDs/);
  cell.catalogReview.candidateCardIds = ["BT24-087"];
  cell.reason = "";
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /exclusion lacks review reason/);
  inventory.effectPlayRouteMatrix.catalogSha256 = "outdated";
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /catalog changed/);
  inventory.source.indexSha256 = "updated-rules";
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /rules changed/);
});

test("an enabled route scope cannot omit its matrix or source-rule references", () => {
  const inventory = fixture();
  inventory.effectPlayRouteMatrix.cells[0].ruleIds = [routeRuleId("burst", "manual-hand")];
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /existing rule references/);
  delete inventory.effectPlayRouteMatrix;
  assert.match(validateRouteMatrix(inventory, root).join("\n"), /matrix is missing/);
  assert.deepEqual(validateRouteMatrix({ obligations: [] }, root), []);
});
