import type { AccountStore, DiscordAvatarCheck } from "./AccountStore.js";

/** Resolves a Discord user's current avatar URL, or null when they have none. Throws when Discord can't answer. */
export type DiscordAvatarSource = (discordUserId: string) => Promise<string | null>;

export const DISCORD_AVATAR_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const LAZY_REFRESH_TIMEOUT_MS = 1500;
export const BACKFILL_TIMEOUT_MS = 10_000;
const BACKFILL_BATCH = 20;
const BACKFILL_DELAY_MS = 250;
const BACKFILL_RATE_LIMIT_ATTEMPTS = 5;

export function discordAvatarUrl(discordUserId: string, avatarHash: string | null | undefined): string | null {
  return avatarHash ? `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.png` : null;
}

export class DiscordRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Discord rate limit reached");
  }
}

export function discordAvatarSourceFromEnvironment(timeoutMs: number): DiscordAvatarSource | undefined {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return undefined;
  return async (discordUserId) => {
    const response = await fetch(`https://discord.com/api/v10/users/${discordUserId}`, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 429)
      throw new DiscordRateLimitError(Number(response.headers.get("retry-after") ?? 1) * 1000);
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

/**
 * Fills the avatar of every Discord account that was never checked.
 * A failed account stays claimed, so the daily refresh retries it on the user's next visit. A rate limit
 * waits Discord's `retry-after` and retries the same account; every API replica runs this backfill, and
 * together they share one Discord bucket.
 */
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
      for (let attempt = 1; ; attempt++) {
        try {
          await applyCheck(store, source, check);
          refreshed++;
          break;
        } catch (error) {
          if (!(error instanceof DiscordRateLimitError)) break;
          if (attempt === BACKFILL_RATE_LIMIT_ATTEMPTS) {
            for (const unchecked of checks.slice(index)) await store.releaseDiscordAvatarCheck(unchecked);
            return refreshed;
          }
          await delay(error.retryAfterMs);
        }
      }
      await delay(BACKFILL_DELAY_MS);
    }
  }
}
