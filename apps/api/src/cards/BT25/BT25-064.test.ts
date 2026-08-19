import { describe, expect, it } from "vitest";
import { compiled as BT25_064 } from "./BT25-064.js";
import "../index.js";

describe("BT25-064 Sunarizamon", () => {
  it("reveals three for an Option and a TS card", () => {
    const onPlay = BT25_064.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((onPlay?.actions?.[0] as { add?: unknown }).add).toEqual([
      expect.objectContaining({ count: 1, to: "hand", filter: { controllerDefault: "mine", kind: ["Option"] } }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
    expect(BT25_064.effects?.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
    ]);
  });
});
