import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_CARD_SLEEVE, getCardSleeveId, setCardSleeveId, subscribeCardSleeve } from "../design/sleeve";
import { useTranslation } from "../i18n";
import { isLocale } from "../i18n/locales";
import { accountApi, type AccountPreferences } from "./client";

/**
 * Keeps the theme, language and sleeve in step with the signed-in account.
 * localStorage stays the instant source, so guests and the first render never wait on the network.
 * On sign-in the account's stored values win; keys the account lacks are backfilled from this device.
 */
export function usePreferencesSync({
  accountId,
  dark,
  setDark,
}: {
  accountId: string | undefined;
  dark: boolean;
  setDark: (dark: boolean) => void;
}): void {
  const { locale, setLocale } = useTranslation();
  const sleeve = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  const [synced, setSynced] = useState<{ accountId: string; preferences: AccountPreferences }>();
  const stored = synced && synced.accountId === accountId ? synced.preferences : undefined;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    void accountApi
      .preferences()
      .then((preferences) => {
        if (cancelled) return;
        if (typeof preferences.darkMode === "boolean") setDark(preferences.darkMode);
        if (isLocale(preferences.locale)) setLocale(preferences.locale);
        if (preferences.sleeve) setCardSleeveId(preferences.sleeve);
        setSynced({ accountId, preferences });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accountId, setDark, setLocale]);

  useEffect(() => {
    if (!accountId || !stored) return;
    const current: AccountPreferences = { darkMode: dark, locale, sleeve };
    const changes = Object.fromEntries(
      Object.entries(current).filter(([key, value]) => stored[key as keyof AccountPreferences] !== value),
    ) as AccountPreferences;
    if (Object.keys(changes).length === 0) return;
    void accountApi
      .updatePreferences(changes)
      .then((preferences) => setSynced({ accountId, preferences }))
      .catch(() => undefined);
  }, [accountId, stored, dark, locale, sleeve]);
}
