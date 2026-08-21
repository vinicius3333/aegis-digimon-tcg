import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-047.js";

describe("BT20-047 Solarmon", () => {
  it("has Blocker as a main effect and Reboot as an inherited effect", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Reboot" }] });
  });
});
