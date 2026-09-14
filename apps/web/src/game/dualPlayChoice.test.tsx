// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { intents } from "../net/intents";
import type { AegisRoom } from "../net/client";
import { DualPlayChoiceOverlay } from "./overlays";

afterEach(cleanup);

it.each(["option", "digimon"] as const)("sends the chosen DUAL side %s to the server", (useAs) => {
  const send = vi.fn<(type: string, payload: unknown) => void>();
  const room = { connection: { isOpen: true }, send } as unknown as AegisRoom;
  render(
    <I18nProvider>
      <DualPlayChoiceOverlay
        cardId="BT26-056"
        onChoose={(side) => intents.playCard(room, "werewolf", undefined, undefined, undefined, side)}
        onCancel={vi.fn<() => void>()}
      />
    </I18nProvider>,
  );
  expect(screen.getByText(/De-Digivolve 3/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: useAs === "option" ? "Use as Option" : "Play as Digimon" }));
  expect(send).toHaveBeenCalledExactlyOnceWith("playCard", expect.objectContaining({ instanceId: "werewolf", useAs }));
});

it("cancels without declaring either side", () => {
  const onChoose = vi.fn<(side: "digimon" | "option") => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nProvider>
      <DualPlayChoiceOverlay cardId="BT26-056" onChoose={onChoose} onCancel={onCancel} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onChoose).not.toHaveBeenCalled();
});
