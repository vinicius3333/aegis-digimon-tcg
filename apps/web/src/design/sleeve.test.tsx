// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardBack } from "./cards";
import { CardSleevePicker } from "./sleevePicker";
import {
  clearCustomCardSleeve,
  getCardSleeveId,
  getCustomCardSleeveSrc,
  setCardSleeveId,
  setCustomCardSleeve,
} from "./sleeve";
import * as battlefield from "./battlefield";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";

describe("card sleeves", () => {
  beforeEach(() => {
    clearCustomCardSleeve();
    localStorage.clear();
    setCardSleeveId("omnimon");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("persists a valid selection and updates existing card backs", () => {
    const { container } = render(
      <>
        <I18nProvider>
          <CardSleevePicker />
        </I18nProvider>
        <CardBack width={70} label={5} />
      </>,
    );

    expect(container.querySelector('img[src="/sleeves/omnimon.webp"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Alphamon, Official Card Sleeves" }));

    expect(localStorage.getItem("aegis.sleeve")).toBe("alphamon");
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("ignores unknown sleeve identifiers", () => {
    setCardSleeveId("unknown");
    expect(localStorage.getItem("aegis.sleeve")).toBe("omnimon");
  });

  it("keeps the opponent card back independent from the local sleeve", () => {
    const { container } = render(
      <>
        <CardBack width={70} useSelectedSleeve />
        <CardBack width={70} useSelectedSleeve={false} />
      </>,
    );

    expect(container.querySelectorAll('img[src="/sleeves/omnimon.webp"]')).toHaveLength(1);
    expect(container.querySelectorAll('img[src="/sleeves/digimon-standard.webp"]')).toHaveLength(1);
  });

  it("keeps Digi-Egg backs white when the main deck sleeve changes", () => {
    const { container } = render(<CardBack width={70} egg />);
    act(() => setCardSleeveId("alphamon"));
    expect(container.querySelector('img[src="/sleeves/digimon-egg.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeNull();
  });
  it("uploads, replaces and removes a custom sleeve on mounted card backs", async () => {
    const first = "data:image/webp;base64,Zmlyc3Q=";
    const second = "data:image/webp;base64,c2Vjb25k";
    vi.spyOn(battlefield, "toStorableDataUrl").mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { container } = render(
      <>
        <I18nProvider>
          <CardSleevePicker />
        </I18nProvider>
        <div data-testid="backs">
          <CardBack />
          <CardBack useSelectedSleeve={false} />
          <CardBack egg />
        </div>
      </>,
    );
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["image"], "sleeve.png", { type: "image/png" })] } });
    await waitFor(() => expect(getCustomCardSleeveSrc()).toBe(first));
    expect(localStorage.getItem("aegis.sleeve.custom")).toBe(first);
    expect(getCardSleeveId()).toBe("custom");
    expect(screen.getByTestId("backs").querySelector("img")?.getAttribute("src")).toBe(first);
    expect(screen.getByRole("button", { name: "Your image, This device" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(input, { target: { files: [new File(["replacement"], "new.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByTestId("backs").querySelector("img")?.getAttribute("src")).toBe(second));
    expect(screen.getByTestId("backs").querySelectorAll('img[src="/sleeves/digimon-standard.webp"]')).toHaveLength(1);
    expect(screen.getByTestId("backs").querySelectorAll('img[src="/sleeves/digimon-egg.webp"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: en["settings.sleeveRemove"] }));
    expect(getCardSleeveId()).toBe("digimon-standard");
    expect(localStorage.getItem("aegis.sleeve.custom")).toBeNull();
    expect(screen.queryByRole("button", { name: "Your image, This device" })).toBeNull();
  });

  it("keeps the custom image when choosing a built-in sleeve and can select it again", () => {
    setCustomCardSleeve("data:image/webp;base64,aW1hZ2U=");
    render(
      <I18nProvider>
        <CardSleevePicker />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Alphamon, Official Card Sleeves" }));
    expect(getCardSleeveId()).toBe("alphamon");
    fireEvent.click(screen.getByRole("button", { name: "Your image, This device" }));
    expect(getCardSleeveId()).toBe("custom");
    act(() => {
      setCardSleeveId("alphamon");
      clearCustomCardSleeve();
    });
    expect(getCardSleeveId()).toBe("alphamon");
  });

  it("rejects non-images and reports conversion failures without changing the selection", async () => {
    const convert = vi.spyOn(battlefield, "toStorableDataUrl").mockRejectedValue(new Error("invalid image"));
    const { container } = render(
      <I18nProvider>
        <CardSleevePicker />
      </I18nProvider>,
    );
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["text"], "file.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("status").textContent).toBe(en["settings.sleeveInvalid"]);
    expect(convert).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(["broken"], "file.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(en["settings.sleeveUploadError"]));
    expect(getCardSleeveId()).toBe("omnimon");
  });

  it("preserves the previous image if storage rejects a replacement", () => {
    const previous = "data:image/webp;base64,b2xk";
    setCustomCardSleeve(previous);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => setCustomCardSleeve("data:image/webp;base64,bmV3")).toThrow("quota");
    expect(getCustomCardSleeveSrc()).toBe(previous);
    expect(getCardSleeveId()).toBe("custom");
  });
});

describe("saved custom sleeve", () => {
  afterEach(() => vi.resetModules());

  it("restores the image and selection after a reload", async () => {
    localStorage.setItem("aegis.sleeve", "custom");
    localStorage.setItem("aegis.sleeve.custom", "data:image/webp;base64,c2F2ZWQ=");
    vi.resetModules();
    const fresh = await import("./sleeve");
    expect(fresh.getCardSleeveId()).toBe("custom");
    expect(fresh.cardSleeveById("custom").src).toBe("data:image/webp;base64,c2F2ZWQ=");
  });

  it("falls back when a saved custom selection has no image", async () => {
    localStorage.setItem("aegis.sleeve", "custom");
    localStorage.removeItem("aegis.sleeve.custom");
    vi.resetModules();
    const fresh = await import("./sleeve");
    expect(fresh.getCardSleeveId()).toBe(fresh.DEFAULT_CARD_SLEEVE.id);
  });
});
