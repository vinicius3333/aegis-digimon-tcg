// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CardOpenerProvider } from "@/game/cardLinks";
import { SecurityBranch } from "@/game/SecurityClashView";
import { Side } from "@/game/side";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

it("opens the resolving Option's card details from the docked card", () => {
  const open = vi.fn<(cardId: string, artId?: string) => void>();
  render(
    <I18nProvider>
      <CardOpenerProvider onOpenCard={open}>
        <SecurityBranch scene={{ key: 1, cardId: "BT24-095", side: Side.Viewer, state: "docked", source: "option" }} />
      </CardOpenerProvider>
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Sonic Shot/ }));
  expect(open).toHaveBeenCalledWith("BT24-095", undefined);
});
