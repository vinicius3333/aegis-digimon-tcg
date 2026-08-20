import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-056.js";

describe("EX6-056 Ogudomon", () => {
  it("has Rush, trashes four deck cards, and de-digivolves an opponent by two when your trash has ten cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Rush");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "TrashTopDeck", amount: 4 }, { kind: "DeDigivolve", amount: 2, stopAtLevel: 3, condition: { kind: "youHave", count: 10 } }]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins in breeding when leaving outside battle", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", leaveCause: "otherThanBattle", sourceFilter: { isSelfRef: true }, actions: [{ kind: "PlaceUnder", target: { from: ["trash"] }, underFilter: { zone: "breeding" } }] }));
});
