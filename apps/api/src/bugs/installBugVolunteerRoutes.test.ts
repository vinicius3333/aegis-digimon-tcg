import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OpenBug, OpenBugDetail, OpenBugPage } from "@aegis/shared/feedback/OpenBug";
import { AccountStore } from "#api/accounts/AccountStore";
import { installAccountRoutes } from "#api/accounts/routes";
import { createMemoryPool } from "#api/db/memoryPool.fixture";

type Harness = {
  store: AccountStore;
  url: string;
  reporter: string;
  volunteer: string;
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
    volunteer: await cookieFor(store, "volunteer", "Mika"),
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

describe("bug volunteer routes", () => {
  it("lists only open bug reports, without reporter or match details", async () => {
    const open = await report("Dianamon skips the prompt");
    await report("Add a dark theme", "improvement");
    const closed = await report("Old crash");
    expect(
      (
        await call("PATCH", `/admin/feedback/${closed}`, harness.admin, {
          revision: 0,
          status: "resolved",
          finalReply: "Fixed",
          internalNote: "",
          duplicateOfId: null,
        })
      ).status,
    ).toBe(200);

    expect((await call("GET", "/feedback/open-bugs")).status).toBe(401);
    const page = await json<OpenBugPage>(await call("GET", "/feedback/open-bugs", harness.volunteer));

    expect(page.items.map((bug) => bug.id)).toEqual([open]);
    expect(page.items[0]).toEqual<OpenBug>({
      id: open,
      summary: "Dianamon skips the prompt",
      description: "Dianamon skips the prompt details",
      cardIds: [],
      status: "new",
      createdAt: expect.any(Number) as number,
      volunteerNames: [],
      claimedByMe: false,
      noteCount: 0,
    });
    expect(JSON.stringify(page)).not.toContain("secret deck list");
    expect(JSON.stringify(page)).not.toContain("Kai");
  });

  it("lets a player claim, note and release a bug, and shows the notes to everyone", async () => {
    const id = await report("GraceNovamon stays");

    const claimed = await json<OpenBugDetail>(await call("PUT", `/feedback/open-bugs/${id}/claim`, harness.volunteer));
    expect(claimed).toMatchObject({ claimedByMe: true, volunteerNames: ["Mika"] });

    expect((await call("POST", `/feedback/open-bugs/${id}/notes`, harness.volunteer, { body: "  " })).status).toBe(400);
    const noted = await json<OpenBugDetail>(
      await call("POST", `/feedback/open-bugs/${id}/notes`, harness.volunteer, { body: "Happens after a No preset." }),
    );
    expect(noted.notes).toMatchObject([{ authorName: "Mika", body: "Happens after a No preset." }]);

    const seenByAdmin = await json<OpenBugDetail>(await call("GET", `/feedback/open-bugs/${id}`, harness.admin));
    expect(seenByAdmin).toMatchObject({ claimedByMe: false, volunteerNames: ["Mika"], noteCount: 1 });

    const released = await json<OpenBugDetail>(
      await call("DELETE", `/feedback/open-bugs/${id}/claim`, harness.volunteer),
    );
    expect(released).toMatchObject({ claimedByMe: false, volunteerNames: [], noteCount: 1 });
  });

  it("refuses claims on closed bugs and hides reports that are not bugs", async () => {
    const improvement = await report("Add a dark theme", "improvement");
    expect((await call("GET", `/feedback/open-bugs/${improvement}`, harness.volunteer)).status).toBe(404);
    expect((await call("PUT", `/feedback/open-bugs/${improvement}/claim`, harness.volunteer)).status).toBe(404);

    const id = await report("Old crash");
    await call("PATCH", `/admin/feedback/${id}`, harness.admin, {
      revision: 0,
      status: "wont_fix",
      finalReply: "Works as printed",
      internalNote: "",
      duplicateOfId: null,
    });
    expect((await call("PUT", `/feedback/open-bugs/${id}/claim`, harness.volunteer)).status).toBe(409);
    expect((await call("GET", `/feedback/open-bugs/${id}`, harness.volunteer)).status).toBe(200);
  });
});
