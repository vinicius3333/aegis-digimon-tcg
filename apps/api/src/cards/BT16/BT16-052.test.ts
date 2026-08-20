import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-052.js";

describe("BT16-052", () => {
  it("optionally plays one KoHagurumon Token on digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayToken", tokens: ["KoHagurumon"], count: 1, payCost: false, optional: true }] });
  });

  it("has inherited Blocker without adding the token restriction to this card", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] });
  });
});
