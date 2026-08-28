import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-040.js";

describe("EX7-040", () => {
  it("draws 2 by optionally trashing a Three Musketeers card from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    }));
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));
});
