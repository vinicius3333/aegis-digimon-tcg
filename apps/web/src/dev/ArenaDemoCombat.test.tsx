// @vitest-environment jsdom
import { Phase } from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ArenaDemo, createArenaDemoState } from "./ArenaDemo";
import { GameScreen } from "../game/GameScreen";
import type { AegisRoom } from "../net/client";
import { intents } from "../net/intents";
import { prepareDemoCombat } from "./arenaDemoCombat";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  ["you-chronomon", "Chronomon: Holy Mode", "keyboard"],
  ["you-hyokomon", "Hyokomon", "keyboard"],
  ["you-chronomon", "Chronomon: Holy Mode", "mouse"],
  ["you-hyokomon", "Hyokomon", "mouse"],
  ["you-chronomon", "Chronomon: Holy Mode", "touch"],
  ["you-hyokomon", "Hyokomon", "touch"],
])("offers attack and target selection for prepared own Digimon %s via %s", (id, name, input) => {
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const attacker = container.querySelector<HTMLElement>(`[data-drop="perm-you"][data-id="${id}"]`)!;
  if (input === "keyboard") fireEvent.keyDown(attacker, { key: "Enter" });
  else {
    const at = { clientX: 140, clientY: 300, pointerId: 7, pointerType: input };
    fireEvent.pointerDown(attacker, at);
    fireEvent.pointerUp(attacker, at);
    // Consume the trailing browser click: the pointerup already opened the panel.
    fireEvent.click(attacker);
  }
  fireEvent.click(within(screen.getByRole("dialog", { name })).getByRole("button", { name: "Attack", exact: true }));
  expect(container.querySelector(".game-action-bar")).toBeNull();
  const security = container.querySelector<HTMLElement>('[data-drop="opp-security"]')!;
  const dobermon = container.querySelector<HTMLElement>('[data-drop="perm-opp"][data-id="opponent-dobermon"]')!;
  expect(security.getAttribute("role")).toBe("button");
  expect(dobermon.getAttribute("tabindex")).toBe("0");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(container.querySelector(".game-action-bar--idle")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Phase" }), { target: { value: Phase.Draw } });
  fireEvent.keyDown(attacker, { key: "Enter" });
  expect(
    within(screen.getByRole("dialog", { name })).queryByRole("button", { name: "Attack", exact: true }),
  ).toBeNull();
});

it("drops target selection when changing phase invalidates the projected attack", () => {
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const attacker = container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="you-chronomon"]')!;
  fireEvent.keyDown(attacker, { key: "Enter" });
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Chronomon: Holy Mode" })).getByRole("button", {
      name: "Attack",
      exact: true,
    }),
  );
  expect(container.querySelector(".game-action-bar")).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Phase" }), { target: { value: Phase.Draw } });
  expect(container.querySelector(".game-action-bar--idle")).toBeTruthy();
  expect(container.querySelector(".game-security-shield--glow")).toBeNull();
});

it("sends direct keyboard/click target intents and cancels by tapping the attacker without any attack strip", () => {
  const state = createArenaDemoState();
  prepareDemoCombat(state);
  const room = {} as AegisRoom;
  const declare = vi.spyOn(intents, "attack").mockImplementation(() => {});
  const { container } = render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => {}}
        demoConnection={{
          room,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision: undefined,
          acknowledgeDecision: () => {},
          error: undefined,
          sessionId: "arena-demo-0",
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );
  const attacker = container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="you-chronomon"]')!;
  function chooseAttack() {
    fireEvent.keyDown(attacker, { key: "Enter" });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Chronomon: Holy Mode" })).getByRole("button", {
        name: "Attack",
        exact: true,
      }),
    );
    expect(container.querySelector(".game-action-bar")).toBeNull();
    expect(screen.queryByText("Attack with")).toBeNull();
  }
  chooseAttack();
  fireEvent.keyDown(container.querySelector('[data-drop="opp-security"]')!, { key: "Enter" });
  expect(declare).toHaveBeenLastCalledWith(room, "you-chronomon", { kind: "player" }, false);
  chooseAttack();
  fireEvent.click(container.querySelector('[data-drop="perm-opp"][data-id="opponent-dobermon"]')!);
  expect(declare).toHaveBeenLastCalledWith(
    room,
    "you-chronomon",
    { kind: "permanent", permanentId: "opponent-dobermon" },
    false,
  );
  chooseAttack();
  const at = { clientX: 140, clientY: 300, pointerId: 7, pointerType: "touch" };
  fireEvent.pointerDown(attacker, at);
  fireEvent.pointerUp(attacker, at);
  fireEvent.click(attacker);
  expect(container.querySelector(".game-action-bar--idle")).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Chronomon: Holy Mode" })).toBeNull();
  expect(declare).toHaveBeenCalledTimes(2);
  chooseAttack();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(container.querySelector(".game-action-bar--idle")).toBeTruthy();
  expect(declare).toHaveBeenCalledTimes(2);
});

it("labels Hyokomon's source as Herança in Portuguese without changing digivolution costs", () => {
  localStorage.setItem("aegis:locale", "pt-BR");
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const own = container.querySelector<HTMLElement>('[data-drop="perm-you"][data-id="you-chronomon"]')!;
  fireEvent.keyDown(own, { key: "Enter" });
  const panel = screen.getByRole("dialog", { name: "Chronomon: Holy Mode" });
  expect(panel.querySelector('[data-card-id="BT26-009"] .arena-permanent-inspector__effect-label')?.textContent).toBe(
    "Hyokomon · Herança",
  );
  expect(panel.querySelector(".arena-permanent-inspector__evolution")?.textContent).toContain("Custo de digievolução");
});
