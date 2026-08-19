import { describe, expect, it } from "vitest";
import { compiled as BT24_031 } from "./BT24-031.js";

describe("BT24-031 Elecmon", () => {
  it("recovers only after the optional top-security add leaves zero security", () => {
    const inherited = BT24_031.effects?.find((entry) => entry.isInherited);
    const recovery = inherited?.actions?.[1] as any;
    expect(recovery).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck" });
    expect(recovery.condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "security",
      op: "lte",
      value: 0,
    });
  });
  it("reveals the two printed search pools on play", () => {
    const reveal = BT24_031.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
  });
});
