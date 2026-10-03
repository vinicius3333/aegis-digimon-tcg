// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getFieldLayout, FieldLayout, setFieldLayout } from "./fieldLayout";

describe("field layout preference", () => {
  beforeEach(() => localStorage.clear());

  it("uses the organized field by default", () => {
    expect(getFieldLayout()).toBe(FieldLayout.Organized);
  });

  it("persists the player's choice", () => {
    setFieldLayout(FieldLayout.Classic);

    expect(getFieldLayout()).toBe(FieldLayout.Classic);
    expect(localStorage.getItem("aegis.field-layout")).toBe("classic");
  });
});
