// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider, translator } from "../i18n";
import { DualPlayChoiceOverlay } from "./overlay/choice/DualPlayChoiceOverlay";

afterEach(cleanup);

it("offers Option use without offering to play a Dual card as a Digimon", () => {
  const onChoose = vi.fn<(useAs: "digimon" | "option") => void>();
  render(
    <I18nProvider>
      <DualPlayChoiceOverlay cardId="EX13-066" onChoose={onChoose} onCancel={vi.fn<() => void>()} />
    </I18nProvider>,
  );
  const t = translator("en");
  expect(screen.queryByRole("button", { name: t("overlay.playAsDigimon") })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: t("overlay.useAsOption") }));
  expect(onChoose).toHaveBeenCalledWith("option");
});
