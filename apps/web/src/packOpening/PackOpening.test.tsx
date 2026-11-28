// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PackOpening } from "@/packOpening/PackOpening";
import { BOOSTER_BOX_PACK_COUNT } from "@/packOpening/BoosterProgress";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderSkippingAnimations() {
  render(
    <I18nProvider>
      <PackOpening />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
}

describe("PackOpening pack count", () => {
  it("opens the chosen number of packs at once", () => {
    renderSkippingAnimations();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Packs to open" }), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Open 3 packs" }));
    expect(screen.getByRole("group", { name: "Opened packs" }).textContent).toContain("/ 3");
    expect(screen.getByRole("button", { name: `Open all (${BOOSTER_BOX_PACK_COUNT - 3})` })).toBeTruthy();
  });

  it("limits the chosen number to the packs left in the box", () => {
    renderSkippingAnimations();
    const picker = screen.getByRole("spinbutton", { name: "Packs to open" });
    fireEvent.change(picker, { target: { value: "99" } });
    expect(picker.getAttribute("max")).toBe(String(BOOSTER_BOX_PACK_COUNT));
    fireEvent.click(screen.getByRole("button", { name: `Open ${BOOSTER_BOX_PACK_COUNT} packs` }));
    expect(screen.getByRole("button", { name: "Start next box" })).toBeTruthy();
  });

  it("steps the pack count within the packs left in the box", () => {
    renderSkippingAnimations();
    const picker = screen.getByRole("spinbutton", { name: "Packs to open" });
    const fewer = screen.getByRole("button", { name: "Fewer packs" });
    const more = screen.getByRole("button", { name: "More packs" });
    expect(screen.getByLabelText("Packs to open")).toBe(picker);
    expect(picker.getAttribute("value")).toBe("1");
    expect(fewer.hasAttribute("disabled")).toBe(true);
    fireEvent.click(more);
    fireEvent.click(more);
    expect(picker.getAttribute("value")).toBe("3");
    expect(screen.getByRole("button", { name: "Open 3 packs" })).toBeTruthy();
    fireEvent.click(fewer);
    expect(screen.getByRole("button", { name: "Open 2 packs" })).toBeTruthy();
    fireEvent.change(picker, { target: { value: "99" } });
    expect(picker.getAttribute("value")).toBe(String(BOOSTER_BOX_PACK_COUNT));
    expect(more.hasAttribute("disabled")).toBe(true);
    fireEvent.click(more);
    expect(picker.getAttribute("value")).toBe(String(BOOSTER_BOX_PACK_COUNT));
  });
});
