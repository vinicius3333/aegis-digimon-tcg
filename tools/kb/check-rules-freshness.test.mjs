import assert from "node:assert/strict";
import test from "node:test";
import { checkFreshness, parsePublishedComprehensive } from "./check-rules-freshness.mjs";
import { buildUnits, chunkUnits } from "./index-rules.mjs";

const page = `<a href="pdf/general_rule.pdf?20260918"><span><p>Comprehensive Rules Manual<br>( Sep. 18, 2026 )</p></span></a>`;
const local =
  "# Comprehensive Rules\n\nDigimon Card Game\nComprehensive Rules Manual\nVer.4.2\nLast Updated: 2026/08/18\n";
const official = "Digimon Card Game\nComprehensive Rules Manual\nVer. 4.3\nLast Updated: 2026/09/18";
const indexFor = (text) => ({
  chunks: chunkUnits(buildUnits(text), { id: "comprehensive", title: "Comprehensive Rules" }),
});
const index = indexFor(local.replace(/^# Comprehensive Rules\n\n/, "").trim());
const inputs = {
  fetchPage: async () => ({ text: page }),
  fetchPdf: async () => ({ buffer: Buffer.from("pdf") }),
  pdfToText: () => official,
  readLocal: () => local,
  readIndex: () => index,
};

test("reports a newer official publication without mutating the committed corpus", async () => {
  const result = await checkFreshness(inputs);
  assert.deepEqual(result, {
    status: "stale",
    publishedDate: "2026-09-18",
    url: "https://world.digimoncard.com/rule/pdf/general_rule.pdf?20260918",
    officialVersion: "4.3",
    committedVersion: "4.2",
    committedDate: "2026-08-18",
    indexedVersion: "4.2",
    indexedDate: "2026-08-18",
    contentMatches: false,
    indexMatches: true,
  });
});

test("reports current only when PDF, Markdown, and index identities match", async () => {
  const result = await checkFreshness({
    ...inputs,
    readLocal: () => `# Comprehensive Rules\n\n${official}\n`,
    readIndex: () => indexFor(official),
  });
  assert.equal(result.status, "current");
  assert.equal(result.contentMatches, true);
  assert.equal(result.indexMatches, true);
});

test("same date with a different PDF version or body remains stale", async () => {
  const matchingDate = local.replace("2026/08/18", "2026/09/18");
  const version = await checkFreshness({
    ...inputs,
    readLocal: () => matchingDate,
    readIndex: () => indexFor(matchingDate.replace(/^# Comprehensive Rules\n\n/, "").trim()),
  });
  assert.equal(version.status, "stale");
  assert.equal(version.committedDate, version.publishedDate);

  const body = await checkFreshness({
    ...inputs,
    readLocal: () => `# Comprehensive Rules\n\n${official}\nDifferent rule body\n`,
    readIndex: () => indexFor(official),
  });
  assert.equal(body.status, "stale");
  assert.equal(body.contentMatches, false);
});

test("matching PDF and Markdown with a stale index remains stale", async () => {
  const result = await checkFreshness({ ...inputs, readLocal: () => `# Comprehensive Rules\n\n${official}\n` });
  assert.equal(result.status, "stale");
  assert.equal(result.contentMatches, true);
  assert.equal(result.indexMatches, false);
});

test("a modified non-header index chunk cannot yield current", async () => {
  const rules = `${official}\n1. Game Overview\n1-1. Each player starts with a deck.`;
  const fullIndex = indexFor(rules);
  assert.ok(fullIndex.chunks.length > 1);
  const editedIndex = structuredClone(fullIndex);
  editedIndex.chunks[1].text = "1. Game Overview\n1-1. Different rule.";
  const result = await checkFreshness({
    ...inputs,
    pdfToText: () => rules,
    readLocal: () => `# Comprehensive Rules\n\n${rules}\n`,
    readIndex: () => editedIndex,
  });
  assert.equal(result.contentMatches, true);
  assert.equal(result.indexMatches, false);
  assert.equal(result.status, "stale");
});

test("fails closed when publisher markup changes", () => {
  assert.throws(() => parsePublishedComprehensive("<a href='pdf/manual.pdf'>Manual</a>"), /Expected one/);
  assert.throws(() => parsePublishedComprehensive(page.replace("Sep. 18, 2026", "new version")), /date not found/);
});
