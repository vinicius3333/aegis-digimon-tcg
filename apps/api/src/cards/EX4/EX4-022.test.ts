import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-022.js";

describe("EX4-022 ZeedGarurumon", () => {
  it("returns an opposing level four or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } });
  });
  it("checks eight cards in hand for the second return and requires a Tamer for the inherited return", () => {
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions?.[1]).toMatchObject({ condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 }, target: { filter: { levelComparison: { op: "gte", value: 6 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "Return", target: { filter: { levels: [3] } }, condition: { kind: "youHave", filter: { kind: ["Tamer"] } } }] }] });
  });
});
