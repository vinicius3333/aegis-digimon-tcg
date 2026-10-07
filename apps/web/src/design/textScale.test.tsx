// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import { Settings } from "../screens/Settings";
import { applyTextScale, getTextScale, setTextScale } from "./textScale";

const rootScale = () => document.documentElement.style.getPropertyValue("--ds-text-scale");

describe("text size", () => {
  afterEach(() => {
    cleanup();
    setTextScale("default");
  });

  it("scales the root text and remembers the choice on this device", () => {
    setTextScale("larger");
    expect(rootScale()).toBe("1.3");
    expect(localStorage.getItem("aegis:textScale")).toBe("larger");

    setTextScale("default");
    expect(rootScale()).toBe("1");
  });

  it("ignores an unknown size", () => {
    setTextScale("large");
    setTextScale("huge" as "large");
    expect(getTextScale()).toBe("large");
  });

  it("is picked from the Settings appearance section", () => {
    render(
      <I18nProvider>
        <Settings
          player={{ name: "Guest", color: "Blue", shards: 0 }}
          account={null}
          dark={false}
          onToggleDark={() => {}}
        />
      </I18nProvider>,
    );
    const group = screen.getByRole("group", { name: en["settings.textSize"] });
    const large = screen.getByRole("button", { name: en["settings.textSizeLarge"] });
    expect(group.contains(large)).toBe(true);

    fireEvent.click(large);
    expect(large.getAttribute("aria-pressed")).toBe("true");
    expect(rootScale()).toBe("1.15");
  });
});

describe("saved text size", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    document.documentElement.style.removeProperty("--ds-text-scale");
  });

  it("restores the saved size at startup", async () => {
    localStorage.setItem("aegis:textScale", "large");
    const fresh = await import("./textScale");
    fresh.applyTextScale();
    expect(fresh.getTextScale()).toBe("large");
    expect(rootScale()).toBe("1.15");
  });

  it("uses the default size for an unknown saved value", async () => {
    localStorage.setItem("aegis:textScale", "huge");
    const fresh = await import("./textScale");
    expect(fresh.getTextScale()).toBe("default");
  });

  it("keeps the stylesheet default until a size is applied", () => {
    expect(rootScale()).toBe("");
    applyTextScale();
    expect(rootScale()).not.toBe("");
  });
});
