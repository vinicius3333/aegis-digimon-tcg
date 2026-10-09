import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CUSTOM_CARD_SLEEVE_ID,
  DEFAULT_CARD_SLEEVE,
  DEFAULT_EGG_SLEEVE,
  getCardSleeveId,
  getEggSleeveId,
  setCardSleeveId,
  setEggSleeveId,
  subscribeCardSleeve,
} from "../design/sleeve";
import {
  sanitizeDeckBuilderPreferences,
  setDeckBuilderPreferences,
  useDeckBuilderPreferences,
} from "../screens/deckBuilderPreferences";
import { setAutoHatchEnabled, useAutoHatch } from "../game/autoHatch";
import { useTranslation } from "../i18n";
import { isLocale } from "../i18n/locales";
import { accountApi, type AccountPreferences } from "./client";

/**
 * Keeps the theme, language, sleeves, auto hatch and deck builder layout in step with the signed-in account.
 * localStorage stays the instant source, so guests and the first render never wait on the network.
 * On sign-in the account's stored values win; keys the account lacks are backfilled from this device.
 * Auto hatch defaults to false for accounts without a saved choice.
 */
export function usePreferencesSync({
  accountId,
  dark,
  setDark,
}: {
  accountId: string | undefined;
  dark: boolean;
  setDark: (dark: boolean) => void;
}): boolean {
  const { locale, setLocale } = useTranslation();
  const autoHatch = useAutoHatch();
  const sleeve = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  const eggSleeve = useSyncExternalStore(subscribeCardSleeve, getEggSleeveId, () => DEFAULT_EGG_SLEEVE.id);
  const { deckShare, deckView, deckSort } = useDeckBuilderPreferences();
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
        if (preferences.sleeve && getCardSleeveId() !== CUSTOM_CARD_SLEEVE_ID) setCardSleeveId(preferences.sleeve);
        if (preferences.eggSleeve && getEggSleeveId() !== CUSTOM_CARD_SLEEVE_ID) setEggSleeveId(preferences.eggSleeve);
        setDeckBuilderPreferences(sanitizeDeckBuilderPreferences(preferences));
        setAutoHatchEnabled(preferences.autoHatch === true);
        setSynced({ accountId, preferences });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accountId, setDark, setLocale]);

  useEffect(() => {
    if (!accountId || !stored) return;
    const current: AccountPreferences = {
      ...(autoHatch || stored.autoHatch !== undefined ? { autoHatch } : {}),
      darkMode: dark,
      locale,
      ...(sleeve !== CUSTOM_CARD_SLEEVE_ID && { sleeve }),
      // Unlike the older keys, the default egg sleeve is not backfilled, so existing accounts see no write.
      ...(eggSleeve !== CUSTOM_CARD_SLEEVE_ID &&
        (eggSleeve !== DEFAULT_EGG_SLEEVE.id || stored.eggSleeve !== undefined) && { eggSleeve }),
      deckShare,
      deckView,
      deckSort,
    };
    const changes = Object.fromEntries(
      Object.entries(current).filter(([key, value]) => stored[key as keyof AccountPreferences] !== value),
    ) as AccountPreferences;
    if (Object.keys(changes).length === 0) return;
    void accountApi
      .updatePreferences(changes)
      .then((preferences) => setSynced({ accountId, preferences }))
      .catch(() => undefined);
  }, [accountId, stored, autoHatch, dark, locale, sleeve, eggSleeve, deckShare, deckView, deckSort]);
  return !accountId || stored !== undefined;
}
