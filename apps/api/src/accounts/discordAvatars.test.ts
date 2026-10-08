import { newDb } from "pg-mem";
import { describe, expect, it, vi } from "vitest";
import { AccountStore } from "./AccountStore.js";
import {
  DISCORD_AVATAR_MAX_AGE_MS,
  type DiscordAvatarSource,
  backfillDiscordAvatars,
  refreshStaleDiscordAvatar,
} from "./discordAvatars.js";

function createStore(): AccountStore {
  return new AccountStore(new (newDb().adapters.createPg().Pool)() as never);
}
const noDelay = async () => undefined;

describe("Discord avatars", () => {
  it("refreshes an avatar only once it is a day old", async () => {
    const store = createStore();
    const account = await store.accountForIdentity("discord", "7", "Tamer", "https://cdn.discordapp.com/old.png");
    const source = vi.fn<DiscordAvatarSource>(async () => "https://cdn.discordapp.com/new.png");

    expect(await refreshStaleDiscordAvatar(store, source, account.id)).toBeUndefined();
    expect(source).not.toHaveBeenCalled();

    const tomorrow = Date.now() + DISCORD_AVATAR_MAX_AGE_MS + 1;
    expect(await refreshStaleDiscordAvatar(store, source, account.id, tomorrow)).toBe(
      "https://cdn.discordapp.com/new.png",
    );
    expect(source).toHaveBeenCalledWith("7");
    expect(await refreshStaleDiscordAvatar(store, source, account.id, tomorrow)).toBeUndefined();
    expect(source).toHaveBeenCalledTimes(1);
    await store.close();
  });

  it("keeps the old avatar when Discord fails", async () => {
    const store = createStore();
    const account = await store.accountForIdentity("discord", "8", "Tamer", "https://cdn.discordapp.com/old.png");
    const failing = vi.fn<DiscordAvatarSource>(async () => {
      throw new Error("down");
    });
    const tomorrow = Date.now() + DISCORD_AVATAR_MAX_AGE_MS + 1;
    expect(await refreshStaleDiscordAvatar(store, failing, account.id, tomorrow)).toBeUndefined();
    expect(await refreshStaleDiscordAvatar(store, failing, account.id, tomorrow)).toBeUndefined();
    expect(failing).toHaveBeenCalledTimes(1);
    await store.close();
  });

  it("backfills unchecked Discord accounts and skips email accounts", async () => {
    const store = createStore();
    const pool = (store as unknown as { pool: { query: (sql: string) => Promise<unknown> } }).pool;
    const legacy = await store.accountForIdentity("discord", "9", "Legacy");
    await store.accountForIdentity("email", "a@example.com", "Mail");
    await pool.query("UPDATE accounts SET avatar_checked_at=NULL");
    const source = vi.fn<DiscordAvatarSource>(async (id: string) => `https://cdn.discordapp.com/${id}.png`);

    expect(await backfillDiscordAvatars(store, source, noDelay)).toBe(1);
    expect(source).toHaveBeenCalledWith("9");
    expect(await backfillDiscordAvatars(store, source, noDelay)).toBe(0);
    const session = await store.session((await store.issueSession(legacy)).id);
    expect(session?.account.avatarUrl).toBe("https://cdn.discordapp.com/9.png");
    await store.close();
  });

  it("releases unprocessed claims when the backfill stops on a failure", async () => {
    const store = createStore();
    const pool = (store as unknown as { pool: { query: (sql: string) => Promise<unknown> } }).pool;
    await store.accountForIdentity("discord", "10", "A");
    await store.accountForIdentity("discord", "11", "B");
    await pool.query("UPDATE accounts SET avatar_checked_at=NULL");
    const rateLimited = vi.fn<DiscordAvatarSource>(async () => {
      throw new Error("429");
    });
    expect(await backfillDiscordAvatars(store, rateLimited, noDelay)).toBe(0);

    const source = vi.fn<DiscordAvatarSource>(async (id: string) => `https://cdn.discordapp.com/${id}.png`);
    expect(await backfillDiscordAvatars(store, source, noDelay)).toBe(2);
    await store.close();
  });
});
