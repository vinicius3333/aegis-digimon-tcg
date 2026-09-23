import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  INDEX_PATH,
  INVENTORY_PATH,
  buildInventory,
  extractCardQa,
  extractErrata,
  extractNumberedRules,
  validateInventory,
} from "./rule-obligations.mjs";

const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const reviewedInventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
const sourceFixtures = {
  qa: {
    "BT23-045": [{ qno: "Q5331", question: "May I decline?", answer: "Yes.", date: "2026-09-18" }],
    "BT23-060": [{ qno: "Q5331", question: "May I decline?", answer: "Yes.", date: "2026-09-18" }],
  },
  errata: {
    "BT25-057": {
      cardId: "BT25-057",
      date: "2026-05-15",
      source: "https://world.digimoncard.com/rule/errata_card/",
      notes: null,
      changes: [{ before: "old", after: "new" }],
    },
  },
  manifest: {
    qa: { fetchedAt: "2026-08-19T00:00:00Z", failed: ["P-053"] },
    errata: { fetchedAt: "2026-08-19T00:00:00Z" },
  },
};

test("extracts individual numbered clauses rather than treating a chunk as one obligation", () => {
  const rules = extractNumberedRules(index);
  const group = rules.filter((record) => record.source.chunkId === "comprehensive-0021");
  assert.ok(group.length > 1);
  assert.ok(group.some((record) => record.id === "comprehensive:1-2-1"));
  assert.equal(new Set(rules.map((record) => record.id)).size, rules.length);
  assert.ok(rules.every((record) => record.status === "gap"));
});

test("citation presence does not create a proven obligation", () => {
  const inventory = buildInventory(index);
  const citedChunk = inventory.obligations.find((record) => record.source.chunkId === "comprehensive-0021");
  assert.equal(citedChunk.status, "gap");
  assert.equal(citedChunk.testPath, null);
  assert.ok(inventory.obligations.some((record) => record.id === "interaction:attack-block-security"));
});

test("refresh preserves reviews only while version and exact source text remain unchanged", () => {
  const original = buildInventory(index);
  const prior = structuredClone(original);
  const reviewed = prior.obligations.find((record) => record.id === "comprehensive:1-2-1");
  reviewed.precondition = "A player meets a victory condition";
  reviewed.expectedResult = "That player wins";
  reviewed.testPath = "tools/kb/rule-obligations.test.mjs";
  reviewed.status = "proven";
  reviewed.reason = null;
  assert.equal(buildInventory(index, prior).obligations.find((record) => record.id === reviewed.id).status, "proven");

  const changed = structuredClone(index);
  changed.chunks.find((chunk) => chunk.id === "comprehensive-0021").text += " Source amendment.";
  assert.equal(buildInventory(changed, prior).obligations.find((record) => record.id === reviewed.id).status, "proven");
  changed.chunks.find((chunk) => chunk.id === "comprehensive-0021").text = changed.chunks
    .find((chunk) => chunk.id === "comprehensive-0021")
    .text.replace("When a player meets", "Whenever a player meets");
  assert.equal(buildInventory(changed, prior).obligations.find((record) => record.id === reviewed.id).status, "gap");

  const versioned = structuredClone(index);
  versioned.chunks.find((chunk) => chunk.id === "comprehensive-0000").text = versioned.chunks
    .find((chunk) => chunk.id === "comprehensive-0000")
    .text.replace(/Ver\.\s*\d+\.\d+/, "Ver.99.0");
  assert.equal(buildInventory(versioned, prior).obligations.find((record) => record.id === reviewed.id).status, "gap");
});

test("checker rejects invented proof and missing records", () => {
  const inventory = buildInventory(index);
  const record = inventory.obligations.find((entry) => entry.id === "comprehensive:1-2-1");
  record.status = "proven";
  assert.match(validateInventory(inventory, index).join("\n"), /lacks observable scenario/);
  inventory.obligations.pop();
  assert.match(validateInventory(inventory, index).join("\n"), /Missing obligation/);
});

test("Card Q&A is deduplicated by Q number and exact ruling fingerprint", () => {
  const records = extractCardQa(sourceFixtures.qa, sourceFixtures.manifest);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].cardIds, ["BT23-045", "BT23-060"]);
  assert.equal(records[0].source.date, "2026-09-18");
  assert.match(records[0].reason, /full crawl: 2026-08-19/);
  const changed = structuredClone(sourceFixtures.qa);
  changed["BT23-060"][0].answer = "No.";
  assert.equal(extractCardQa(changed, sourceFixtures.manifest).length, 2);
});

test("errata creates one gap per card and change with source currency", () => {
  const changed = structuredClone(sourceFixtures.errata);
  changed["BT25-057"].changes.push({ before: "other old", after: "other new" });
  const records = extractErrata(changed, sourceFixtures.manifest);
  assert.deepEqual(
    records.map(({ id }) => id),
    ["errata:BT25-057:1", "errata:BT25-057:2"],
  );
  assert.ok(records.every((record) => record.status === "gap" && /unverified/.test(record.reason)));
});

test("Q&A and errata source changes invalidate review and stale local corpora fail check", () => {
  const prior = buildInventory(index, null, sourceFixtures);
  const qa = prior.obligations.find((record) => record.kind === "card-qa");
  qa.status = "proven";
  qa.precondition = "A borrowed effect is activated";
  qa.expectedResult = "The optional cost can be declined";
  qa.testPath = "tools/kb/rule-obligations.test.mjs";
  qa.reason = null;
  const unchanged = buildInventory(index, prior, sourceFixtures);
  assert.equal(unchanged.obligations.find((record) => record.id === qa.id).status, "proven");
  const linked = structuredClone(sourceFixtures);
  linked.qa["BT23-061"] = structuredClone(linked.qa["BT23-060"]);
  assert.equal(buildInventory(index, prior, linked).obligations.find((record) => record.id === qa.id).status, "gap");
  const recrawled = structuredClone(sourceFixtures);
  recrawled.manifest.qa.fetchedAt = "2026-09-23T00:00:00Z";
  assert.equal(buildInventory(index, prior, recrawled).obligations.find((record) => record.id === qa.id).status, "gap");
  const changed = structuredClone(sourceFixtures);
  changed.qa["BT23-045"][0].answer = "No.";
  changed.qa["BT23-060"][0].answer = "No.";
  assert.ok(buildInventory(index, prior, changed).obligations.every((record) => record.id !== qa.id));
  const stale = structuredClone(prior);
  stale.corpora.qa.localSha256 = "stale";
  assert.match(validateInventory(stale, index).join("\n"), /corpus is stale/);
});

test("representative reviewed clauses keep proof only while exact source stays current", () => {
  const ids = [
    "comprehensive:3-4-3",
    "comprehensive:3-7-2",
    "comprehensive:3-7-4",
    "comprehensive:5-2-1-5",
    "comprehensive:15-7-4",
    "comprehensive:15-15-7-4",
  ];
  const errors = validateInventory(reviewedInventory, index);
  assert.deepEqual(errors, []);
  const refreshed = buildInventory(index, reviewedInventory);
  for (const id of ids) {
    const record = refreshed.obligations.find((entry) => entry.id === id);
    assert.equal(record.status, "proven", id);
    assert.ok(record.precondition && record.expectedResult && record.testPath, id);
  }
  const changed = structuredClone(index);
  changed.chunks.find((chunk) => chunk.id === "comprehensive-0066").text = changed.chunks
    .find((chunk) => chunk.id === "comprehensive-0066")
    .text.replace("The security stack is a private area.", "The security stack is a public area.");
  assert.equal(
    buildInventory(changed, reviewedInventory).obligations.find((record) => record.id === "comprehensive:3-7-2").status,
    "gap",
  );
  assert.match(validateInventory(reviewedInventory, changed).join("\n"), /stale/i);
});
