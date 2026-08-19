import { describe, expect, it } from "vitest";
import { compiled as BT25_025 } from "./BT25-025.js";
import "../index.js";

describe("BT25-025 Aegiochusmon: Blue", () => {
  it("de-digivolves one opposing Digimon and conditionally unsuspends yours", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_025.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
  });

  it("only watches removal from your own security and preserves Blocker/Decode", () => {
    const inherited = BT25_025.effects?.find((entry) => entry.isInherited);
    const watcher = inherited?.actions?.[0] as { sourceFilter?: unknown } | undefined;
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "mine" } });
    expect(BT25_025.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
        expect.objectContaining({ keywords: [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }] }),
      ]),
    );
  });
});
