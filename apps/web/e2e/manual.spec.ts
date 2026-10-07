import { expect, test } from "@playwright/test";
import { Client } from "@colyseus/sdk";
import {
  ROOM_TYPE_MANUAL,
  ROOM_TYPE_MANUAL_PRIVATE,
  MANUAL_SNAPSHOT,
  MANUAL_SYNC,
  MANUAL_COMMAND,
  type ManualSnapshot,
} from "@aegis/shared";
import { RED_DECK, BLUE_DECK } from "../../api/dist/engine/testDecks.js";
import { startManualServer } from "./manual-server";
import { ManualPage } from "./manual-page";

let server: Awaited<ReturnType<typeof startManualServer>>;
test.beforeEach(async () => {
  server = await startManualServer();
});
test.afterEach(async () => {
  await server.close();
});

test("manual public room keeps both seat views private and resumes after disconnect", async () => {
  const client = new Client(server.endpoint);
  const a = await client.joinOrCreate(ROOM_TYPE_MANUAL, { manualMode: true, displayName: "Alice", deck: RED_DECK });
  const b = await client.joinOrCreate(ROOM_TYPE_MANUAL, { manualMode: true, displayName: "Bob", deck: BLUE_DECK });
  let av: ManualSnapshot | undefined;
  let bv: ManualSnapshot | undefined;
  a.onMessage<ManualSnapshot>(MANUAL_SNAPSHOT, (s) => {
    av = s;
  });
  b.onMessage<ManualSnapshot>(MANUAL_SNAPSHOT, (s) => {
    bv = s;
  });
  a.send(MANUAL_SYNC);
  b.send(MANUAL_SYNC);
  await expect.poll(() => av?.players.length).toBe(2);
  await expect.poll(() => bv?.players.length).toBe(2);
  expect(a.roomId).toBe(b.roomId);
  expect(av!.players[0]!.hand.every((c) => !!c.cardId)).toBe(true);
  expect(av!.players[1]!.hand.every((c) => !c.cardId && !c.id && !c.artId)).toBe(true);
  a.send(MANUAL_COMMAND, { revision: av!.revision, action: { type: "ready" } });
  await expect.poll(() => bv?.players[0]?.ready).toBe(true);
  b.send(MANUAL_COMMAND, { revision: bv!.revision, action: { type: "ready" } });
  await expect.poll(() => av?.phase).toBe("playing");
  for (const p of av!.players) expect(p.security.every((c) => !c.cardId && !c.id)).toBe(true);
  a.send(MANUAL_COMMAND, { revision: av!.revision, action: { type: "take", from: "deck", to: "reveal", count: 2 } });
  await expect.poll(() => bv?.players[0]?.reveal.length).toBe(2);
  expect(bv!.players[0]!.reveal.every((c) => !!c.cardId)).toBe(true);
  const token = a.reconnectionToken;
  a.reconnection.enabled = false;
  await a.leave(false);
  const resumed = await client.reconnect(token);
  let view: ManualSnapshot | undefined;
  resumed.onMessage<ManualSnapshot>(MANUAL_SNAPSHOT, (s) => {
    view = s;
  });
  resumed.send(MANUAL_SYNC);
  await expect.poll(() => view?.seat).toBe(0);
  expect(resumed.roomId).toBe(b.roomId);
  expect(view!.players[0]!.reveal).toHaveLength(2);
  await resumed.leave();
  await b.leave();
});

test("manual invite rejects wrong codes and automatic clients", async () => {
  const client = new Client(server.endpoint);
  const a = await client.create(ROOM_TYPE_MANUAL_PRIVATE, { manualMode: true, displayName: "Alice", deck: RED_DECK });
  let view: ManualSnapshot | undefined;
  a.onMessage<ManualSnapshot>(MANUAL_SNAPSHOT, (s) => {
    view = s;
  });
  a.send(MANUAL_SYNC);
  await expect.poll(() => view?.roomCode.length).toBe(6);
  await expect(
    client.joinById(a.roomId, { manualMode: true, roomCode: "WRONG1", displayName: "Bob", deck: BLUE_DECK }),
  ).rejects.toThrow();
  await expect(
    client.joinById(a.roomId, { roomCode: view!.roomCode, displayName: "Bob", deck: BLUE_DECK }),
  ).rejects.toThrow();
  const b = await client.joinById(a.roomId, {
    manualMode: true,
    roomCode: view!.roomCode,
    displayName: "Bob",
    deck: BLUE_DECK,
  });
  expect(b.roomId).toBe(a.roomId);
  await b.leave();
  await a.leave();
});

test("players enter the manual queue through the lobby and play, undo and reload", async ({ browser }) => {
  const ca = await browser.newContext();
  const cb = await browser.newContext();
  const a = new ManualPage(await ca.newPage());
  const b = new ManualPage(await cb.newPage());
  try {
    await a.lobby();
    await a.queue();
    await b.lobby();
    await b.queue();
    await a.ready();
    await b.ready();
    await expect(a.page.getByRole("button", { name: "Draw", exact: true })).toBeEnabled();
    await a.page.goBack();
    await expect(a.page.getByRole("dialog")).toBeVisible();
    await a.page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(a.page.getByRole("button", { name: "Draw", exact: true })).toBeEnabled();
    await a.draw();
    await expect(a.table.getByRole("heading", { name: "Hand (6)", exact: true })).toBeVisible();
    await a.page.getByRole("button", { name: "Request undo", exact: true }).click();
    await b.page.getByRole("button", { name: "Approve undo", exact: true }).click();
    await expect(a.table.getByRole("heading", { name: "Hand (6)", exact: true })).toHaveCount(0);
    await a.page.reload();
    await expect(a.page.getByRole("button", { name: "Draw", exact: true })).toBeEnabled();
    await a.page.getByRole("button", { name: "Check security", exact: true }).click();
    await expect(b.table.getByRole("heading", { name: "Security (4)", exact: true })).toBeVisible();
    await a.page.screenshot({ path: "test-results/manual-desktop.png", fullPage: true });
    await a.page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await a.page.screenshot({ path: "test-results/manual-mobile.png", fullPage: true });
  } finally {
    await ca.close();
    await cb.close();
  }
});

test("manual invite link opens the correct lobby mode and joins the host", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = new ManualPage(await hostContext.newPage());
  const guest = new ManualPage(await guestContext.newPage());
  try {
    await host.lobby();
    await host.host();
    const link = await host.page.getByRole("textbox", { name: "Copy invite link" }).inputValue();
    await guest.page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await guest.page.goto(link);
    await expect(guest.page.getByRole("button", { name: /Manual table.*Players resolve/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await guest.page.getByRole("button", { name: "Join manual room", exact: true }).click();
    await host.ready();
    await guest.ready();
    // The first own hand button is a physical copy; duplicate names are intentional.
    const card = host.table.getByRole("region", { name: "Hand", exact: true }).getByRole("button").first();
    await card.click();
    await host.page.getByRole("button", { name: "Move card", exact: true }).click();
    await expect(host.page.getByRole("button", { name: "Draw", exact: true })).toBeEnabled();
    await expect(
      guest.table.getByRole("region", { name: "Battle area", exact: true }).getByRole("article"),
    ).toHaveCount(1);
    await host.page.getByRole("button", { name: "Create token", exact: true }).click();
    await expect(
      guest.table.getByRole("region", { name: "Battle area", exact: true }).getByRole("article"),
    ).toHaveCount(2);
    await host.page.getByRole("button", { name: "Concede", exact: true }).click();
    await host.page.getByRole("dialog").getByRole("button", { name: "Concede", exact: true }).click();
    await expect(guest.page.getByRole("heading", { name: "You won", exact: true })).toBeVisible();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
