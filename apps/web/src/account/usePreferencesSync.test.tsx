// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCardSleeveId, setCardSleeveId } from "../design/sleeve";
import { I18nProvider, useTranslation } from "../i18n";
import { accountApi, type AccountPreferences } from "./client";
import { usePreferencesSync } from "./usePreferencesSync";

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function renderSync(accountId: string | undefined) {
  return renderHook(
    ({ id }) => {
      const [dark, setDark] = useState(false);
      usePreferencesSync({ accountId: id, dark, setDark });
      return { dark, setDark, locale: useTranslation().locale };
    },
    { wrapper, initialProps: { id: accountId } },
  );
}

function echoUpdates(stored: AccountPreferences) {
  let merged = stored;
  return vi.spyOn(accountApi, "updatePreferences").mockImplementation(async (changes) => {
    merged = { ...merged, ...changes };
    return merged;
  });
}

beforeEach(() => {
  localStorage.clear();
  setCardSleeveId("digimon-standard");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("usePreferencesSync", () => {
  it("does not touch the network for a guest", () => {
    const load = vi.spyOn(accountApi, "preferences");
    renderSync(undefined);
    expect(load).not.toHaveBeenCalled();
  });

  it("applies the account's stored preferences on sign-in without writing them back", async () => {
    const stored = { darkMode: true, locale: "pt-BR", sleeve: "omnimon" };
    vi.spyOn(accountApi, "preferences").mockResolvedValue(stored);
    const update = echoUpdates(stored);
    const { result } = renderSync("account-1");
    await waitFor(() => expect(result.current.locale).toBe("pt-BR"));
    expect(result.current.dark).toBe(true);
    expect(getCardSleeveId()).toBe("omnimon");
    expect(update).not.toHaveBeenCalled();
  });

  it("backfills keys the account lacks and sends later changes", async () => {
    const stored = { locale: "en" };
    vi.spyOn(accountApi, "preferences").mockResolvedValue(stored);
    const update = echoUpdates(stored);
    const { result } = renderSync("account-1");
    await waitFor(() => expect(update).toHaveBeenCalledWith({ darkMode: false, sleeve: "digimon-standard" }));
    act(() => result.current.setDark(true));
    await waitFor(() => expect(update).toHaveBeenLastCalledWith({ darkMode: true }));
    expect(update).toHaveBeenCalledTimes(2);
  });
});
