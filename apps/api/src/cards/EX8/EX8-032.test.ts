import { describe, expect, it } from "vitest";
import "../index.js";
import { compiled } from "./EX8-032.js";

describe("EX8-032", () => {
  it("has no effects beyond its printed digivolution requirement", () => expect(compiled.effects).toEqual([]));
});
