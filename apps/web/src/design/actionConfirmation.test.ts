// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { areActionConfirmationsEnabled, setActionConfirmationsEnabled } from "./actionConfirmation";

describe("action confirmation preference", () => {
  beforeEach(() => localStorage.clear());

  it("is enabled by default", () => {
    expect(areActionConfirmationsEnabled()).toBe(true);
  });

  it("persists the player's choice", () => {
    setActionConfirmationsEnabled(false);

    expect(areActionConfirmationsEnabled()).toBe(false);
    expect(localStorage.getItem("aegis.action-confirmation.enabled")).toBe("false");
  });
});
