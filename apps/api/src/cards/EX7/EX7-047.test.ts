import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-047.js";

describe("EX7-047", () => {
  it("reveals 4 and may play NSp Digimon from among them up to a total play cost of 7", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 4, add: [{ count: "all", totalPlayCostBudget: 7, to: "play", optional: true }], rest: "deckBottom" }));
  it("can DNA digivolve into an NSp card from hand once per turn at end of turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "DnaDigivolve", optional: true, materials: { count: 2 }, into: { zone: "hand" } }] }));
});
