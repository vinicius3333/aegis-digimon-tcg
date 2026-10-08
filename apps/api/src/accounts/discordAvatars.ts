import type { AccountStore, DiscordAvatarCheck } from "./AccountStore.js";

/** Resolves a Discord user's current avatar URL, or null when they have none. Throws when Discord can't answer. */
export type DiscordAvatarSource = (discordUserId: string) => Promise<string | null>;

export const DISCORD_AVATAR_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const LAZY_REFRESH_TIMEOUT_MS = 1500;
const BACKFILL_BATCH = 20;
const BACKFILL_DELAY_MS = 100;

export function discordAvatarUrl(discordUserId: string, avatarHash: string | null | undefined): string | null {
  return avatarHash ? `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.png` : null;
}

export function discordAvatarSourceFromEnvironment(): DiscordAvatarSource | undefined {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return undefined;
  return async (discordUserId) => {
    const response = await fetch(`https://discord.com/api/v10/users/${discordUserId}`, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(LAZY_REFRESH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Discord user lookup failed with ${response.status}`);
    const user = (await response.json()) as { avatar?: string | null };
    return discordAvatarUrl(discordUserId, user.avatar);
  };
}

async function applyCheck(store: AccountStore, source: DiscordAvatarSource, check: DiscordAvatarCheck) {
  const avatarUrl = await source(check.discordUserId);
  await store.setAvatarUrl(check.accountId, avatarUrl);
  return avatarUrl;
}

/**
 * Refreshes one account's Discord avatar when its last check is older than a day.
 * Returns the new URL, or undefined when nothing was checked. A failed lookup keeps the old avatar and
 * waits for the next day rather than retrying on every request.
 */
export async function refreshStaleDiscordAvatar(
  store: AccountStore,
  source: DiscordAvatarSource,
  accountId: string,
  now = Date.now(),
): Promise<string | null | undefined> {
  const [check] = await store.claimDiscordAvatarChecks({
    staleBefore: now - DISCORD_AVATAR_MAX_AGE_MS,
    limit: 1,
    accountId,
  });
  if (!check) return undefined;
  try {
    return await applyCheck(store, source, check);
  } catch {
    return undefined;
  }
}

/** Fills the avatar of every Discord account that was never checked. Stops at the first failure, such as a rate limit. */
export async function backfillDiscordAvatars(
  store: AccountStore,
  source: DiscordAvatarSource,
  delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<number> {
  let refreshed = 0;
  for (;;) {
    const checks = await store.claimDiscordAvatarChecks({ staleBefore: 0, limit: BACKFILL_BATCH });
    if (checks.length === 0) return refreshed;
    for (const [index, check] of checks.entries()) {
      try {
        await applyCheck(store, source, check);
        refreshed++;
      } catch {
        for (const unchecked of checks.slice(index)) await store.releaseDiscordAvatarCheck(unchecked);
        return refreshed;
      }
      await delay(BACKFILL_DELAY_MS);
    }
  }
}
