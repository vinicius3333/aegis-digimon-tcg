import { describe, expect, it } from "vitest";
import { compiled as BT24_090 } from "./BT24-090.js";
import "../index.js";

describe("BT24-090 Abyss Sanctuary: Throne Room", () => {
  it("models face-up security effects and the bottom-security Main sequence", () => {
    const security = BT24_090.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" } });
    expect(security?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Alliance" },
      condition: {
        kind: "youHave",
        filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"] },
      },
    });

    const main = BT24_090.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", position: "bottom" });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      toTop: false,
      faceUp: true,
    });
    expect(main?.actions?.[2]).toMatchObject({ kind: "PlayWithoutCost", reduceCostBy: 3, optional: true });
  });
});
