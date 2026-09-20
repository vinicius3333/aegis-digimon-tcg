// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { BattleRow, suspendedCardEdgeClearance } from "./BattleRow";

it("reserves enough scrollable edge room for the first and last cards to turn sideways", () => {
  const cardWidth = 230;
  const rotatedOverflow = (cardWidth * 1.4 - cardWidth) / 2;
  const clearance = suspendedCardEdgeClearance(cardWidth);

  expect(clearance).toBeGreaterThan(rotatedOverflow);
  const { container } = render(
    <I18nProvider>
      <BattleRow edgeClearance={clearance} aria-label="Battle area">
        <div>first card</div>
        <div>last card</div>
      </BattleRow>
    </I18nProvider>,
  );
  const spacers = container.querySelectorAll<HTMLElement>(".game-battle-row__turn-clearance");
  expect(spacers).toHaveLength(2);
  expect(spacers[0]?.style.flexBasis).toBe(`${clearance}px`);
  expect(spacers[1]?.style.flexBasis).toBe(`${clearance}px`);
});
