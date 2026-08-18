import { readFile } from "node:fs/promises";

const token = process.env.GH_TOKEN;
const repository = process.env.GH_REPOSITORY;
const batchSize = Number.parseInt(process.env.ROADMAP_BATCH_SIZE ?? "150", 10);
const imageBase = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";

if (!token || !repository) throw new Error("GH_TOKEN and GH_REPOSITORY are required");

const cards = JSON.parse(await readFile(new URL("./cards.json", import.meta.url), "utf8"));

async function request(path, options = {}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
        ...options.headers,
      },
    });

    if (response.ok) return response.status === 204 ? null : response.json();

    if (response.status !== 403 && response.status !== 429) {
      throw new Error(`${options.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`);
    }

    const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "60", 10);
    await delay(Math.max(retryAfter, 60) * 1000 * (attempt + 1));
  }

  throw new Error(`GitHub rate limit did not recover for ${path}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function listIssues() {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await request(`/repos/${repository}/issues?state=all&per_page=100&page=${page}`);
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) return issues;
  }
}

const issues = await listIssues();
const issueByTitle = new Map(issues.map((issue) => [issue.title, issue]));
const createdCardIds = new Set(cards.filter((card) => issueByTitle.has(card.cardId)).map((card) => card.cardId));
const pending = cards.filter((card) => !createdCardIds.has(card.cardId)).slice(0, batchSize);

for (const card of pending) {
  const totalInSet = cards.filter((candidate) => candidate.set === card.set).length;
  const position = cards.filter((candidate) => candidate.set === card.set).findIndex((candidate) => candidate.cardId === card.cardId);
  const part = Math.floor(position / 100) + 1;
  const parentTitle = totalInSet > 100 ? `${card.set} — Part ${part}` : card.set;
  const parent = issueByTitle.get(parentTitle);
  if (!parent) throw new Error(`Missing parent issue: ${parentTitle}`);

  const imageId = card.imageId.replace(/-Errata$/, "");
  const body = `![${card.cardId}](${imageBase}/${imageId}.webp)`;
  const issue = await request(`/repos/${repository}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: card.cardId, body }),
  });
  await delay(1000);
  await request(`/repos/${repository}/issues/${parent.number}/sub_issues`, {
    method: "POST",
    body: JSON.stringify({ sub_issue_id: issue.id }),
  });
  await delay(1000);
  console.log(`created ${card.cardId} under ${parentTitle}`);
}

console.log(`complete=${createdCardIds.size + pending.length} total=${cards.length}`);
