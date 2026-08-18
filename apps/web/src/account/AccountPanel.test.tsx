// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { AccountPanel } from "./AccountPanel";
import { accountApi, type RemoteAccount } from "./client";

const ACCOUNT: RemoteAccount = {
  id: "account-1",
  displayName: "Remote Tamer",
  avatarUrl: null,
  avatarId: null,
  isAdmin: false,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AccountPanel nickname", () => {
  it("edits the authenticated account nickname through the API", async () => {
    vi.spyOn(accountApi, "profile").mockResolvedValue({ account: ACCOUNT, stats: { rankedWins: 0, rankedLosses: 0, rankedDraws: 0, rankedDodges: 0, tournamentWins: 0, tournamentLosses: 0, tournamentDraws: 0, tournamentsPlayed: 0, tournamentsWon: 0 }, decks: [], matches: [] });
    const updated = { ...ACCOUNT, displayName: "New Tamer" };
    vi.spyOn(accountApi, "updateDisplayName").mockResolvedValue(updated);
    const onAccountChange = vi.fn<(account: RemoteAccount) => void>();

    render(<I18nProvider><AccountPanel account={ACCOUNT} onAccountChange={onAccountChange} /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Nickname"), { target: { value: "New Tamer" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(accountApi.updateDisplayName).toHaveBeenCalledWith("New Tamer"));
    expect(onAccountChange).toHaveBeenCalledWith(updated);
  });

  it("does not expose account nickname editing while signed out", () => {
    render(<I18nProvider><AccountPanel account={null} /></I18nProvider>);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeTruthy();
  });
});
