import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-038.js";

describe("EX5-038 Vikaralamon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] }]);
  });
  it("once per turn unsuspends itself when one of your Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true } } }] });
  });
});
