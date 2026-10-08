// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { I18nProvider } from "../i18n";
import { accountApi, AccountApiError, type RemoteAccount } from "./client";
import { ProfileCustomize, allowProfileNavigation } from "./ProfileCustomize";
const original: RemoteAccount = {
  id: "demo",
  displayName: "Tamer",
  avatarId: "tyrannomon",
  avatarUrl: null,
  isAdmin: false,
};
const player = { name: "Guest", color: "Blue", shards: 0 };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open(extra: Partial<Parameters<typeof ProfileCustomize>[0]> = {}) {
  function Harness() {
    const [account, setAccount] = useState<RemoteAccount | null>(original);
    return (
      <I18nProvider>
        <ProfileCustomize player={player} account={account} onAccountChange={setAccount} {...extra} />
      </I18nProvider>
    );
  }
  render(<Harness />);
}
it("stages avatar/name, cancels locally, then saves both atomically", async () => {
  const save = vi
    .spyOn(accountApi, "updateProfile")
    .mockResolvedValue({ ...original, displayName: "New Tamer", avatarId: "greymon" });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Use Greymon as your avatar" }));
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Use Tyrannomon as your avatar" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  fireEvent.change(screen.getByRole("textbox", { name: /Name|name/ }), { target: { value: "New Tamer" } });
  fireEvent.click(screen.getByRole("button", { name: "Use Greymon as your avatar" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Profile updated.");
  expect(save).toHaveBeenCalledWith({ displayName: "New Tamer", avatarId: "greymon" });
  expect((screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(true);
});
it("keeps the draft after a failed save and supports retry", async () => {
  const save = vi
    .spyOn(accountApi, "updateProfile")
    .mockRejectedValueOnce(new AccountApiError(409, "display_name_taken"))
    .mockResolvedValue({ ...original, avatarId: null });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Default avatar" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Default avatar" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Profile updated.");
  expect(save).toHaveBeenCalledTimes(2);
});
it("only guards a dirty draft", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  open();
  expect(allowProfileNavigation()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Default avatar" }));
  expect(allowProfileNavigation()).toBe(false);
  expect(confirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(allowProfileNavigation()).toBe(true);
});
it("saves guest identity locally without calling the account API", async () => {
  const save = vi.spyOn(accountApi, "updateProfile");
  const guest = vi.fn();
  open({ account: null, onGuestChange: guest });
  fireEvent.click(screen.getByRole("button", { name: "Use Greymon as your avatar" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(guest).toHaveBeenCalledWith("Guest", "greymon"));
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Discord" })).toBeNull();
});
it("preserves Discord refresh and cooldown feedback only for linked accounts", async () => {
  const refresh = vi.fn().mockRejectedValue(new AccountApiError(429, "cooldown"));
  open({ account: { ...original, discordLinked: true }, onRefreshDiscordAvatar: refresh });
  fireEvent.click(screen.getByRole("button", { name: "Refresh Discord picture" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "You just refreshed it. Try again in a minute.",
  );
});

it("serializes saving with Discord refresh and blocks leaving during the request", async () => {
  let finish!: () => void;
  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const save = vi.spyOn(accountApi, "updateProfile").mockResolvedValue({ ...original, avatarId: null });
  open({ onRefreshDiscordAvatar: refresh, account: { ...original, discordLinked: true } });
  fireEvent.click(screen.getByRole("button", { name: "Refresh Discord picture" }));
  fireEvent.click(screen.getByRole("button", { name: "Discord" }));
  expect(allowProfileNavigation()).toBe(false);
  expect((screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(true);
  expect(save).not.toHaveBeenCalled();
  finish();
  await waitFor(() =>
    expect((screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(false),
  );
});
it("does not prompt a second time on unload after accepting discard", () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Default avatar" }));
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
  expect(allowProfileNavigation()).toBe(true);
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
});
