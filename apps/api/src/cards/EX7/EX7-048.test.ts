import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-048.js";

describe("EX7-048", () => {
  it("reveals 6 and may play a Three Musketeers Option without paying its cost", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 6, add: [{ count: 1, to: "play", payCost: false, optional: true }], rest: "deckTopOrBottom" }));
  it("prevents a Three Musketeers Digimon from leaving play by trashing an Option in its digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", cost: { kind: "trash", target: { count: 1, filter: { zone: "digivolutionCards", kind: ["Option"] } } } }));
});
