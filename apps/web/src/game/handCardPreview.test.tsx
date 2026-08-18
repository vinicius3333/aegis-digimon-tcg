// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { HandCardPreview } from "./GameScreen";

afterEach(() => cleanup());

it("offers a server-projected hand Main effect and sends its exact source key", () => {
  const onActivateEffect = vi.fn();
  const effect = {
    instanceId: "cyber-instance",
    effectKey: "BT10-025/ir-14-0",
    description: "[Hand][Main] Place this card under a Blue Flare Digimon.",
  };

  render(
    <I18nProvider>
      <HandCardPreview
        cardId="BT10-025"
        activatableEffects={[effect]}
        canPlay
        canDigivolve={false}
        onPlay={() => undefined}
        onActivateEffect={onActivateEffect}
        onChooseBase={() => undefined}
        onCancel={() => undefined}
      />
    </I18nProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Activate effect" }));
  expect(onActivateEffect).toHaveBeenCalledWith(effect);
  expect(screen.getByRole("button", { name: "Play Digimon" })).toBeTruthy();
});

it("does not invent a hand effect action when the server projection is empty", () => {
  render(
    <I18nProvider>
      <HandCardPreview
        cardId="BT10-025"
        activatableEffects={[]}
        canPlay
        canDigivolve={false}
        onPlay={() => undefined}
        onActivateEffect={() => undefined}
        onChooseBase={() => undefined}
        onCancel={() => undefined}
      />
    </I18nProvider>,
  );

  expect(screen.queryByRole("button", { name: "Activate effect" })).toBeNull();
});
