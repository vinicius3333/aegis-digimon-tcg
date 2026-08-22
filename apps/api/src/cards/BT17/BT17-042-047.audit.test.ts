import { describe, expect, it } from "vitest";
import { compiled as c042 } from "./BT17-042.js";
import { compiled as c043 } from "./BT17-043.js";
import { compiled as c044 } from "./BT17-044.js";
import { compiled as c045 } from "./BT17-045.js";
import { compiled as c046 } from "./BT17-046.js";
import { compiled as c047 } from "./BT17-047.js";

describe("BT17-042–047 compiled card audits", () => {
  it("BT17-042 reveals three and adds Argomon/Rhythm, with inherited memory", () => {
    expect(c042.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" })] }),
      expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })] }),
    ]));
  });

  it("BT17-043–047 retain their printed timing and effect seams", () => {
    expect(c043.effects?.map((e) => e.trigger)).toEqual(["YourTurn", "AllTurns"]);
    expect(c044.effects?.map((e) => e.trigger)).toEqual(["YourTurn", "YourTurn"]);
    expect(c045.effects?.map((e) => e.trigger)).toEqual(["WhenDigivolving", "OnDeletion"]);
    expect(c046.effects?.map((e) => e.trigger)).toEqual(["OnDeletion", "AllTurns"]);
    expect(c047.effects?.map((e) => e.trigger)).toEqual(["Security", "OnPlay", "WhenDigivolving", "AllTurns"]);
    expect(c047.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Security", actions: [expect.objectContaining({ kind: "PlayWithoutCost" })] }),
      expect.objectContaining({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "SubTrigger" })] }),
    ]));
  });
});
