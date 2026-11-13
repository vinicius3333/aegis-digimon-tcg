// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n";
import { MulliganOverlay } from "@/game/overlay/match/MulliganOverlay";
import type { TurnOrder } from "@/game/overlay/types";

afterEach(cleanup);

function renderMulligan(turnOrder?: TurnOrder) {
  render(
    <I18nProvider>
      <MulliganOverlay
        handCards={[{ cardId: "BT1-010" }]}
        turnOrder={turnOrder}
        onKeep={() => {}}
        onMulligan={() => {}}
      />
    </I18nProvider>,
  );
}

describe("turn order in the mulligan window", () => {
  it("tells the first player they are going first", () => {
    renderMulligan("first");

    expect(screen.getByText("You're going FIRST")).toBeTruthy();
  });

  it("tells the second player they are going second", () => {
    renderMulligan("second");

    expect(screen.getByText("You're going SECOND")).toBeTruthy();
  });
});
