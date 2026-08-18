// Tiny BM25 ranker for the rules prose. The corpus is a few hundred chunks, so
// the index is built per query — no persistence needed. Keyword search keeps the
// KB dependency-free; swap in embeddings here later only if recall proves weak.

const STOPWORDS = new Set(
  ("a an the of to in on for and or is are be can not it its this that these those you " +
    "your with as at by from if when then they them their there here").split(" "),
);

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (token) => token.length > 1 && !STOPWORDS.has(token),
  );
}

export function bm25Search(query, docs, { k1 = 1.5, b = 0.75, limit = 5 } = {}) {
  const docTokens = docs.map((doc) => tokenize(`${doc.title ?? ""} ${doc.text}`));
  const count = docs.length || 1;
  const avgLength = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / count;

  const documentFrequency = new Map();
  for (const tokens of docTokens) {
    for (const token of new Set(tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const idf = (token) => {
    const df = documentFrequency.get(token) ?? 0;
    return Math.log(1 + (count - df + 0.5) / (df + 0.5));
  };

  const queryTokens = [...new Set(tokenize(query))];

  return docs
    .map((doc, i) => {
      const tokens = docTokens[i];
      const length = tokens.length || 1;
      const termFrequency = new Map();
      for (const token of tokens) termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);

      let score = 0;
      for (const token of queryTokens) {
        const frequency = termFrequency.get(token) ?? 0;
        if (frequency === 0) continue;
        score +=
          idf(token) * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * length) / avgLength)));
      }
      return { doc, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// A readable snippet centered on the first query-term hit.
export function snippet(text, query, width = 280) {
  const flat = text.replace(/\s+/g, " ").trim();
  const terms = new Set(tokenize(query));
  let hit = -1;
  for (const match of flat.toLowerCase().matchAll(/[a-z0-9]+/g)) {
    if (terms.has(match[0])) {
      hit = match.index;
      break;
    }
  }
  if (hit === -1) return flat.slice(0, width) + (flat.length > width ? "…" : "");
  const start = Math.max(0, hit - Math.floor(width / 3));
  const end = Math.min(flat.length, start + width);
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "");
}
