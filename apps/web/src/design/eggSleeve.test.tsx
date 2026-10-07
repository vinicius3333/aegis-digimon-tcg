// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { CardBack } from "./cards";
import {
  DEFAULT_EGG_SLEEVE,
  clearCustomCardSleeve,
  getEffectiveEggSleeveId,
  getEggSleeveId,
  setCardSleeveId,
  setCustomCardSleeve,
  setDeckEggSleeveId,
  setEggSleeveId,
} from "./sleeve";
import { EggSleevePicker } from "./sleevePicker";

const EGG_BACK = 'img[src="/sleeves/digimon-egg.webp"]';

beforeEach(() => {
  clearCustomCardSleeve();
  setCardSleeveId("omnimon");
  setEggSleeveId(DEFAULT_EGG_SLEEVE.id);
  setDeckEggSleeveId(undefined);
});

afterEach(() => {
  cleanup();
  setDeckEggSleeveId(undefined);
  setEggSleeveId(DEFAULT_EGG_SLEEVE.id);
});

describe("egg sleeve fallback", () => {
  it("defaults to the white Digi-Egg back for existing players", () => {
    expect(getEffectiveEggSleeveId()).toBe("digimon-egg");
    const { container } = render(<CardBack width={70} egg />);
    expect(container.querySelector(EGG_BACK)).toBeTruthy();
  });

  it("uses the deck's egg sleeve, then the global one, then the Digi-Egg back", () => {
    setEggSleeveId("gold");
    setDeckEggSleeveId("alphamon");
    expect(getEffectiveEggSleeveId()).toBe("alphamon");

    setDeckEggSleeveId("retired-sleeve");
    expect(getEffectiveEggSleeveId()).toBe("gold");

    setDeckEggSleeveId(undefined);
    setEggSleeveId("retired-sleeve");
    expect(getEffectiveEggSleeveId()).toBe("gold");
    setEggSleeveId(DEFAULT_EGG_SLEEVE.id);
    expect(getEffectiveEggSleeveId()).toBe("digimon-egg");
  });

  it("falls back from another device's uploaded image", () => {
    setDeckEggSleeveId("custom");
    expect(getEffectiveEggSleeveId()).toBe("digimon-egg");
  });

  it("returns to the Digi-Egg back when the uploaded image it used is removed", () => {
    setCustomCardSleeve("data:image/webp;base64,ZWdn");
    setEggSleeveId("custom");
    expect(getEggSleeveId()).toBe("custom");
    clearCustomCardSleeve();
    expect(getEggSleeveId()).toBe("digimon-egg");
  });

  it("paints the player's egg pile and keeps the opponent's on the Digi-Egg back", () => {
    const { container } = render(
      <>
        <div data-testid="own">
          <CardBack width={70} egg />
        </div>
        <div data-testid="opponent">
          <CardBack width={70} egg useSelectedSleeve={false} />
        </div>
      </>,
    );
    act(() => setDeckEggSleeveId("gold"));
    expect(container.querySelector('[data-testid="own"] img[src="/sleeves/gold.webp"]')).toBeTruthy();
    expect(container.querySelector(`[data-testid="opponent"] ${EGG_BACK}`)).toBeTruthy();
  });

  it("keeps the main sleeve and the egg sleeve independent", () => {
    const { container } = render(
      <>
        <CardBack width={70} />
        <CardBack width={70} egg />
      </>,
    );
    act(() => setEggSleeveId("gold"));
    expect(container.querySelector('img[src="/sleeves/omnimon.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src="/sleeves/gold.webp"]')).toBeTruthy();
  });
});

describe("egg sleeve picker", () => {
  it("sets the global egg sleeve from Settings", () => {
    render(
      <I18nProvider>
        <EggSleevePicker />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Digi-Egg, Standard Card Back" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Gold, Official Card Sleeves" }));
    expect(getEggSleeveId()).toBe("gold");
  });
});
