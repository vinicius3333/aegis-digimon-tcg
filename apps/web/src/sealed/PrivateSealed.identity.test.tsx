import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrivateSealed } from "@/sealed/PrivateSealed";
import { I18nProvider } from "@/i18n/I18nProvider";
import { loadIdentity } from "@/identity";
import { requestPrivateSealed } from "@/sealed/requestPrivateSealed";

vi.mock("@/game/GameScreen", () => ({ GameScreen: () => null }));
vi.mock("@/sealed/SealedPoolBuilder", () => ({ SealedPoolBuilder: () => null }));
vi.mock("@/sealed/requestPrivateSealed", () => ({ requestPrivateSealed: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/play");
});

it("creates with the existing automatic web guest identity without a name prompt", async () => {
  window.history.replaceState(null, "", "/play");
  const player = loadIdentity();
  expect(loadIdentity().name).toBe(player.name);
  vi.mocked(requestPrivateSealed).mockResolvedValue({ ok: false, error: { status: 0, code: "network_error" } });
  render(
    <I18nProvider>
      <PrivateSealed displayName={player.name} onClose={() => undefined} />
    </I18nProvider>,
  );
  expect(screen.queryByRole("textbox", { name: /player name/i })).toBeNull();
  expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.change(screen.getByRole("combobox", { name: "Booster series" }), { target: { value: "BT26" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(requestPrivateSealed).toHaveBeenCalledTimes(1));
  expect(requestPrivateSealed).toHaveBeenCalledWith({
    code: undefined,
    action: undefined,
    body: { name: player.name, requestId: expect.any(String), setId: "BT26" },
  });
});

it("joins an invitation using the effective account display name without exposing a name field or account ID", async () => {
  window.history.replaceState(null, "", "/play?privateSealed=0123456789abcdef01");
  vi.mocked(requestPrivateSealed).mockResolvedValue({ ok: false, error: { status: 0, code: "network_error" } });
  render(
    <I18nProvider>
      <PrivateSealed displayName="Account Tamer" onClose={() => undefined} />
    </I18nProvider>,
  );
  expect(screen.queryByLabelText(/player name/i)).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Booster series" })).toBeNull();
  expect((screen.getByRole("button", { name: "Join" }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await waitFor(() => expect(requestPrivateSealed).toHaveBeenCalledTimes(1));
  expect(requestPrivateSealed).toHaveBeenCalledWith({
    code: "0123456789ABCDEF01",
    action: "join",
    body: { name: "Account Tamer", requestId: expect.any(String) },
  });
});
