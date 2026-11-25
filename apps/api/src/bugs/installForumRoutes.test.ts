import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ForumDetail, ForumPage, ForumSummary } from "@aegis/shared/feedback/Forum";
import type { OwnFeedbackPage } from "@aegis/shared/feedback/types";
import { AccountStore } from "#api/accounts/AccountStore";
import { installAccountRoutes } from "#api/accounts/routes";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { FeedbackStore } from "#api/bugs/FeedbackStore";

type Harness = {
  store: AccountStore;
  url: string;
  reporter: string;
  believer: string;
  skeptic: string;
  admin: string;
  close: () => Promise<void>;
};

let harness: Harness;

async function cookieFor(store: AccountStore, subject: string, name: string, isAdmin = false): Promise<string> {
  const account = await store.accountForIdentity("discord", subject, name);
  if (isAdmin) await store.pool.query("UPDATE accounts SET roles=ARRAY['admin'] WHERE id=$1", [account.id]);
  return `aegis_session=${(await store.issueSession(account)).id}`;
}

beforeEach(async () => {
  const store = new AccountStore(createMemoryPool());
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, store);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  harness = {
    store,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    reporter: await cookieFor(store, "reporter", "Kai"),
    believer: await cookieFor(store, "believer", "Mika"),
    skeptic: await cookieFor(store, "skeptic", "Rin"),
    admin: await cookieFor(store, "admin", "Vn", true),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
});

afterEach(async () => {
  await harness.close();
  await harness.store.close();
});

function call(method: string, path: string, cookie?: string, body?: unknown): Promise<Response> {
  return fetch(`${harness.url}${path}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function report(summary: string, kind = "bug"): Promise<number> {
  const response = await call("POST", "/bug-reports", harness.reporter, {
    kind,
    summary,
    description: `${summary} details`,
    opponentDeck: "secret deck list",
  });
  expect(response.status).toBe(201);
  return (await json<{ number: number }>(response)).number;
}

const vote = (
  id: number,
  cookie: string,
  verdict: string,
  reason = "I reproduced it twice in practice.",
  board = "bugs",
) => call("PUT", `/feedback/${board}/${id}/vote`, cookie, { verdict, reason });

async function decide(id: number, revision: number, status: string, confirmedBug: boolean) {
  const response = await call("PATCH", `/admin/feedback/${id}`, harness.admin, {
    revision,
    status,
    finalReply: "Thanks for the report.",
    internalNote: "",
    duplicateOfId: null,
    confirmedBug,
  });
  expect(response.status).toBe(200);
}

const coins = async (cookie: string) =>
  (await json<ForumSummary>(await call("GET", "/feedback/bugs/summary", cookie))).aegisCoins;

describe("forum routes", () => {
  it("lists open bug reports without private fields and counts what is waiting for a vote", async () => {
    const id = await report("Dianamon skips the prompt");
    await report("Add a dark theme", "improvement");

    expect((await call("GET", "/feedback/bugs")).status).toBe(401);
    expect(await json<ForumSummary>(await call("GET", "/feedback/bugs/summary"))).toEqual({
      open: 1,
      awaitingVote: null,
      aegisCoins: null,
    });
    const page = await json<ForumPage>(await call("GET", "/feedback/bugs", harness.believer));
    expect(page.items.map((bug) => bug.id)).toEqual([id]);
    expect(JSON.stringify(page)).not.toContain("secret deck list");
    expect(JSON.stringify(page)).not.toContain("Kai");
    expect(await json<ForumSummary>(await call("GET", "/feedback/bugs/summary", harness.believer))).toEqual({
      open: 1,
      awaitingVote: 1,
      aegisCoins: 0,
    });
    expect((await json<ForumSummary>(await call("GET", "/feedback/bugs/summary", harness.reporter))).awaitingVote).toBe(
      0,
    );
  });

  it("requires a reason, refuses the reporter's own vote and hides the tally until the report closes", async () => {
    const id = await report("GraceNovamon asks twice");

    expect((await vote(id, harness.believer, "yes", "short")).status).toBe(400);
    expect((await vote(id, harness.believer, "maybe")).status).toBe(400);
    expect((await vote(id, harness.reporter, "yes")).status).toBe(403);

    const voted = await json<ForumDetail>(await vote(id, harness.believer, "yes"));
    expect(voted).toMatchObject({ myVote: { verdict: "yes" }, tally: null });
    await vote(id, harness.skeptic, "no", "The card text says you may end the attack.");

    const seenBySkeptic = await json<ForumDetail>(await call("GET", `/feedback/bugs/${id}`, harness.skeptic));
    expect(seenBySkeptic.tally).toBeNull();
    expect(JSON.stringify(seenBySkeptic)).not.toContain("reproduced");
    const seenByAdmin = await json<ForumDetail>(await call("GET", `/feedback/bugs/${id}`, harness.admin));
    expect(seenByAdmin.tally).toMatchObject({ yes: 1, no: 1 });

    const commented = await json<ForumDetail>(
      await call("POST", `/feedback/bugs/${id}/comments`, harness.skeptic, { body: "Happens only after a No preset." }),
    );
    expect(commented.comments).toMatchObject([{ authorName: "Rin", body: "Happens only after a No preset." }]);
  });

  it("pays the side the admin agrees with, and takes the coins back when the verdict changes", async () => {
    const id = await report("Endless Elecmon");
    await vote(id, harness.believer, "yes");
    await vote(id, harness.skeptic, "no", "It is your own deck shown every time.");

    await decide(id, 0, "resolved", true);
    expect(await coins(harness.believer)).toBe(1);
    expect(await coins(harness.skeptic)).toBe(0);
    expect(await coins(harness.reporter)).toBe(1);
    expect((await json<OwnFeedbackPage>(await call("GET", "/feedback/mine", harness.reporter))).aegisCoins).toBe(1);
    expect((await vote(id, harness.skeptic, "yes")).status).toBe(409);

    const decided = await json<ForumDetail>(await call("GET", `/feedback/bugs/${id}`, harness.skeptic));
    expect(decided).toMatchObject({ outcome: "yes", tally: { yes: 1, no: 1 } });
    expect(
      (await json<ForumPage>(await call("GET", "/feedback/bugs?state=decided", harness.skeptic))).items.map(
        (bug) => bug.id,
      ),
    ).toEqual([id]);

    await decide(id, 1, "wont_fix", false);
    expect(await coins(harness.believer)).toBe(0);
    expect(await coins(harness.skeptic)).toBe(1);
    expect(await coins(harness.reporter)).toBe(0);

    await decide(id, 2, "triaged", false);
    expect(await coins(harness.skeptic)).toBe(0);
  });

  it("pays nobody for a duplicate", async () => {
    const original = await report("Original");
    const id = await report("Same thing");
    await vote(id, harness.believer, "yes");
    const response = await call("PATCH", `/admin/feedback/${id}`, harness.admin, {
      revision: 0,
      status: "duplicate",
      finalReply: "Tracked elsewhere.",
      internalNote: "",
      duplicateOfId: original,
    });
    expect(response.status).toBe(200);
    expect(await coins(harness.believer)).toBe(0);
    const decided = await json<ForumPage>(await call("GET", "/feedback/bugs?state=decided", harness.believer));
    expect(decided.items.map((item) => item.id)).toContain(id);
    expect(decided.items.find((item) => item.id === id)?.outcome).toBeNull();
  });

  it("answers 404 when an admin removes a vote with a malformed voter ID", async () => {
    const id = await report("Malformed voter");
    expect((await call("DELETE", `/feedback/bugs/${id}/votes/not-a-uuid`, harness.admin)).status).toBe(404);
  });

  it("pages the list ten reports at a time", async () => {
    const feedback = new FeedbackStore(harness.store);
    for (let index = 0; index < 12; index++)
      await feedback.save(
        { kind: "bug", summary: `Bug ${index}`, description: "details", cardIds: [] },
        undefined,
        false,
      );
    const first = await json<ForumPage>(await call("GET", "/feedback/bugs", harness.believer));
    const second = await json<ForumPage>(await call("GET", "/feedback/bugs?page=2", harness.believer));
    expect(first).toMatchObject({ page: 1, pageSize: 10, total: 12 });
    expect(first.items).toHaveLength(10);
    expect(second.items.map((bug) => bug.summary)).toEqual(["Bug 1", "Bug 0"]);
    expect((await call("GET", "/feedback/bugs?page=0", harness.believer)).status).toBe(400);
  });

  it("lets admins delete comments and votes, taking back a paid coin", async () => {
    const id = await report("Moderated");
    await vote(id, harness.believer, "yes");
    const commented = await json<ForumDetail>(
      await call("POST", `/feedback/bugs/${id}/comments`, harness.skeptic, { body: "Rude but long comment here." }),
    );
    const commentId = commented.comments[0]!.id;
    expect((await call("DELETE", `/feedback/bugs/${id}/comments/${commentId}`, harness.skeptic)).status).toBe(403);

    const asAdmin = await json<ForumDetail>(await call("GET", `/feedback/bugs/${id}`, harness.admin));
    expect(asAdmin.canModerate).toBe(true);
    const voterId = asAdmin.tally!.ballots[0]!.voterId!;
    expect(
      (await json<ForumDetail>(await call("DELETE", `/feedback/bugs/${id}/comments/${commentId}`, harness.admin)))
        .comments,
    ).toEqual([]);

    await decide(id, 0, "resolved", true);
    expect(await coins(harness.believer)).toBe(1);
    const afterRemoval = await json<ForumDetail>(
      await call("DELETE", `/feedback/bugs/${id}/votes/${voterId}`, harness.admin),
    );
    expect(afterRemoval.tally).toMatchObject({ yes: 0, no: 0 });
    expect(await coins(harness.believer)).toBe(0);
  });

  it("answers the replay route without a stored replay", async () => {
    const id = await report("No replay");
    const detail = await json<ForumDetail>(await call("GET", `/feedback/bugs/${id}`, harness.believer));
    expect(detail.hasReplay).toBe(false);
    expect((await call("GET", `/feedback/bugs/${id}/replay`, harness.believer)).status).toBe(404);
  });

  it("runs an ideas board of upvotes for improvements, sorted by upvotes and paying no coins", async () => {
    const bug = await report("A bug");
    const folders = await report("Add deck folders", "improvement");
    const rematch = await report("Rematch button", "improvement");
    expect((await call("GET", `/feedback/ideas/${bug}`, harness.believer)).status).toBe(404);

    const upvoted = await json<ForumDetail>(await call("PUT", `/feedback/ideas/${folders}/vote`, harness.believer));
    expect(upvoted).toMatchObject({ upvotes: 1, myVote: { verdict: "yes" }, tally: null });
    await call("PUT", `/feedback/ideas/${folders}/vote`, harness.skeptic);
    expect((await call("PUT", `/feedback/ideas/${rematch}/vote`, harness.reporter)).status).toBe(200);

    const page = await json<ForumPage>(await call("GET", "/feedback/ideas", harness.believer));
    expect(page.items.map((item) => [item.id, item.upvotes])).toEqual([
      [folders, 2],
      [rematch, 1],
    ]);

    await decide(folders, 0, "resolved", false);
    expect(await coins(harness.believer)).toBe(0);
    const decided = await json<ForumPage>(await call("GET", "/feedback/ideas?state=decided", harness.believer));
    expect(decided.items.map((item) => item.id)).toEqual([folders]);
    const removed = await json<ForumDetail>(await call("DELETE", `/feedback/ideas/${rematch}/vote`, harness.reporter));
    expect(removed.upvotes).toBe(0);
  });
});
