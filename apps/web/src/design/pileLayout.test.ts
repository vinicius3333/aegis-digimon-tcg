// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getPileLayout, PileLayout, setPileLayout } from "./pileLayout";

describe("pile layout preference", () => {
  beforeEach(() => localStorage.clear());

  it("uses the tabletop layout by default", () => {
    expect(getPileLayout()).toBe(PileLayout.Tabletop);
  });

  it("persists the player's choice", () => {
    setPileLayout(PileLayout.Classic);

    expect(getPileLayout()).toBe(PileLayout.Classic);
    expect(localStorage.getItem("aegis.pile-layout")).toBe("classic");
  });
});
