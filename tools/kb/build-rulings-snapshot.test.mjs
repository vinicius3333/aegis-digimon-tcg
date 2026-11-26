import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import test from "node:test";
import {
  buildRulingsSnapshot,
  cleanRuleText,
  findKeywordTokens,
  isKeywordToken,
  mergeDuplicateQa,
  splitRulingsSnapshot,
} from "./build-rulings-snapshot.mjs";
import { ROOT } from "./lib/paths.mjs";

const blockerChunk = {
  id: "comprehensive-0223",
  source: "comprehensive",
  sourceTitle: "Comprehensive Rules",
  section: "16-5",
  title: "<Blocker>",
  text: "16-5. <Blocker>",
};
const saveChunk = {
  ...blockerChunk,
  id: "comprehensive-0238",
  section: "16-20",
  title: "<Save>",
  text: "16-20. <Save>",
};
const materialSaveChunk = {
  ...blockerChunk,
  id: "comprehensive-0239",
  section: "16-21",
  title: "<Material Save>",
  text: "16-21. <Material Save>",
};
const orderChunk = {
  ...blockerChunk,
  id: "comprehensive-0164",
  section: "15-4-3",
  title: "Simultaneous Triggering",
  text: "15-4-3. Simultaneous Triggering",
};
const nameChunk = { ...blockerChunk, id: "comprehensive-0034", section: "2-3-1", title: "Name", text: "2-3-1. Name" };
const rulesIndex = { chunks: [blockerChunk, saveChunk, materialSaveChunk, orderChunk, nameChunk] };
const obligations = {
  obligations: [
    { kind: "rule", branch: "ordering", status: "proven", source: { chunkId: "comprehensive-0164" } },
    { kind: "rule", branch: "ordering", status: "gap", source: { chunkId: "comprehensive-0034" } },
    { kind: "rule", branch: "applies", status: "proven", source: { chunkId: "comprehensive-0223" } },
  ],
};

function fingerprint(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

test("findKeywordTokens reads full-width and entity brackets", () => {
  assert.deepEqual(findKeywordTokens("＜Blocker＞ gains &lang;Delay&rang; and <De-Digivolve 1>"), [
    "Blocker",
    "Delay",
    "De-Digivolve 1",
  ]);
});

test("isKeywordToken matches parameters without confusing longer keyword names", () => {
  assert.equal(isKeywordToken({ token: "De-Digivolve 1", keyword: "De-Digivolve" }), true);
  assert.equal(isKeywordToken({ token: "Link +1", keyword: "Link +" }), true);
  assert.equal(isKeywordToken({ token: "Material Save 1", keyword: "Save" }), false);
  assert.equal(isKeywordToken({ token: "Blast DNA Digivolve", keyword: "Blast Digivolve" }), false);
});

test("buildRulingsSnapshot keeps official entries, keyword sections and verified card citations", () => {
  const citedFile = path.join(ROOT, "apps/api/src/cards/BT1/BT1-001.test.ts");
  const snapshot = buildRulingsSnapshot({
    cards: [
      { cardId: "BT1-001", effectText: "＜Blocker＞", inheritedEffectText: "＜Material Save 1＞" },
      { cardId: "BT1-002", effectText: "[On Play] Gain 1 memory." },
      { cardId: "BT1-003", effectText: "" },
    ],
    errata: { "BT1-002": { date: "2024-01-01", changes: [{ before: "old", after: "new" }], notes: null } },
    qa: { "BT1-001": [{ qno: "Q1", question: "Question?", answer: "Answer.", date: "2024-02-02", related: [] }] },
    rulesIndex,
    obligations,
    citations: [
      { id: "comprehensive-0034", file: citedFile, fingerprint: fingerprint(nameChunk.text) },
      { id: "comprehensive-0164", file: citedFile, fingerprint: "stale" },
      { id: "comprehensive-0034", file: path.join(ROOT, "apps/api/src/engine/conformance/x.test.ts") },
    ],
  });

  assert.deepEqual(snapshot.effectOrderSections, ["comprehensive-0164"]);
  assert.deepEqual(snapshot.cards, {
    "BT1-001": {
      qa: [{ id: "Q1", date: "2024-02-02", question: "Question?", answer: "Answer." }],
      sections: ["comprehensive-0034", "comprehensive-0223", "comprehensive-0239"],
    },
    "BT1-002": {
      errata: { date: "2024-01-01", changes: [{ before: "old", after: "new" }], notes: null },
    },
  });
  assert.deepEqual(Object.keys(snapshot.sections), [
    "comprehensive-0034",
    "comprehensive-0164",
    "comprehensive-0223",
    "comprehensive-0239",
  ]);
  assert.deepEqual(snapshot.sections["comprehensive-0223"], {
    section: "16-5",
    title: "<Blocker>",
    sourceTitle: "Comprehensive Rules",
    text: "16-5. <Blocker>",
  });
});

test("cleanRuleText removes the comprehensive rules PDF artifacts and nothing else", () => {
  assert.equal(
    cleanRuleText(
      'an X-card DigiXros17 isn\'t considered to be performed. (For39 details, refer to 15-8-5 "Immediate-Type Effects")15-8-5\n16-22-3.',
    ),
    'an X-card DigiXros isn\'t considered to be performed. (For details, refer to 15-8-5 "Immediate-Type Effects")\n16-22-3.',
  );
  assert.equal(
    cleanRuleText("When a Digimon with40 this effect has 2 instances42 of <Link +1>, see the effect26 text"),
    "When a Digimon with this effect has 2 instances of <Link +1>, see the effect text",
  );
  assert.equal(
    cleanRuleText('(For details, refer to 15-4-4 "Pending Activation")15-4-\n15-4-3-3. The non- turn player'),
    '(For details, refer to 15-4-4 "Pending Activation")\n15-4-3-3. The non-turn player',
  );
  assert.equal(
    cleanRuleText('refer to 15-8- 2 "Persistent Effects" and refer to 15- 8-2 "Persistent Effects"'),
    'refer to 15-8-2 "Persistent Effects" and refer to 15-8-2 "Persistent Effects"',
  );
  assert.equal(cleanRuleText("face- down, immediate- type, DP- based"), "face-down, immediate-type, DP-based");
  const untouched = 'Lv6 BT3-092 ST1-01 <Link +1> DP 12000 "Blocker" (refer to 12 "Blocking")\n16-5-2.';
  assert.equal(cleanRuleText(untouched), untouched);
});

test("mergeDuplicateQa keeps one entry with both IDs only when the normalized text matches", () => {
  const merged = mergeDuplicateQa([
    {
      id: "Q1105",
      date: "2024-03-28",
      question: "Do I gain a memory?",
      answer: "Yes, BT3-92 [MaloMyotismon] is in play.",
    },
    {
      id: "Q1109",
      date: "2024-03-28",
      question: "Do I  gain a memory?",
      answer: "Yes, [BT3-92 MaloMyotismon] is in play.",
    },
    { id: "Q1120", date: "2024-03-28", question: "Do I gain a memory?", answer: "Yes, the effect activates twice." },
  ]);
  assert.deepEqual(merged, [
    {
      id: "Q1105",
      ids: ["Q1105", "Q1109"],
      date: "2024-03-28",
      question: "Do I gain a memory?",
      answer: "Yes, BT3-92 [MaloMyotismon] is in play.",
    },
    { id: "Q1120", date: "2024-03-28", question: "Do I gain a memory?", answer: "Yes, the effect activates twice." },
  ]);
});

test("splitRulingsSnapshot writes the effect-order rules and one file per card set", () => {
  const derivedChunk = {
    ...orderChunk,
    id: "comprehensive-0166",
    section: "15-4-5",
    title: "Derived Triggering",
    text: "15-4-5. Derived Triggering\n15-4-5-3. If a derived triggering effect occurs for the non- turn player",
  };
  const snapshot = buildRulingsSnapshot({
    cards: [
      { cardId: "BT3-092", effectText: "<Blocker>" },
      { cardId: "BT3-001", effectText: "" },
      { cardId: "EX1-064", effectText: "" },
    ],
    errata: {},
    qa: {
      "BT3-001": [{ qno: "Q1", question: "Q?", answer: "A." }],
      "EX1-064": [{ qno: "Q2", question: "Q?", answer: "A." }],
    },
    rulesIndex: { chunks: [...rulesIndex.chunks, derivedChunk] },
    obligations,
    citations: [],
  });
  assert.deepEqual(snapshot.effectOrderSections, ["comprehensive-0164", "comprehensive-0166"]);
  assert.match(snapshot.sections["comprehensive-0166"].text, /non-turn player$/);
  const files = splitRulingsSnapshot(snapshot);
  assert.deepEqual([...files.keys()], ["effect-order.json", "sets/BT3.json", "sets/EX1.json"]);
  assert.deepEqual(Object.keys(files.get("sets/BT3.json").cards), ["BT3-092", "BT3-001"]);
  assert.deepEqual(Object.keys(files.get("sets/BT3.json").sections), ["comprehensive-0223"]);
  assert.deepEqual(Object.keys(files.get("sets/EX1.json").sections), []);
  assert.deepEqual(Object.keys(files.get("effect-order.json").sections), ["comprehensive-0164", "comprehensive-0166"]);
});
