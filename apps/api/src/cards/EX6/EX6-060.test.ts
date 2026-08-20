import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-060.js";

describe("EX6-060 Belphemon: Sleep Mode", () => {
  it("trashes up to three hand cards, suspends one low-level opponent per card, and deletes all lowest-cost suspended Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Trash", target: { count: 3, upTo: true }, trackCount: "trashedCards" }, { kind: "RepeatPerCount", countSource: "trashedCards", action: { kind: "Suspend" } }, { kind: "Delete", target: { count: "all", filter: { superlative: "lowestPlayCost" } } }]));
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving outside battle", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", leaveCause: "otherThanBattle", actions: [{ kind: "PlaceUnder", target: { from: ["trash"] }, position: "bottom", underFilter: { zone: "breedingArea" } }] }));
});
