// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CardBack } from "./cards";
import {
  clearCustomCardSleeve,
  getCardSleeveId,
  getEffectiveCardSleeveId,
  setCardSleeveId,
  setDeckSleeveId,
} from "./sleeve";

beforeEach(() => {
  clearCustomCardSleeve();
  setCardSleeveId("omnimon");
  setDeckSleeveId(undefined);
});

afterEach(() => {
  cleanup();
  setDeckSleeveId(undefined);
});

describe("deck sleeve", () => {
  it("replaces the global sleeve on card backs while the deck is playing", () => {
    const { container } = render(<CardBack width={70} />);
    act(() => setDeckSleeveId("alphamon"));
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeTruthy();
    expect(getCardSleeveId()).toBe("omnimon");

    act(() => setDeckSleeveId(undefined));
    expect(container.querySelector('img[src="/sleeves/omnimon.webp"]')).toBeTruthy();
  });

  it("falls back to the global sleeve for a sleeve this device cannot show", () => {
    setDeckSleeveId("custom");
    expect(getEffectiveCardSleeveId()).toBe("omnimon");
    setDeckSleeveId("retired-sleeve");
    expect(getEffectiveCardSleeveId()).toBe("omnimon");
  });

  it("keeps opponent and Digi-Egg backs on their own art", () => {
    setDeckSleeveId("alphamon");
    const { container } = render(
      <>
        <CardBack width={70} useSelectedSleeve={false} />
        <CardBack width={70} egg />
      </>,
    );
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeNull();
  });
});
