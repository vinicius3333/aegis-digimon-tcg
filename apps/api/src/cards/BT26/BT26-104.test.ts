import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-104.js";

describe("BT26-104 compiled fidelity", () => {
  it("registers memory, Shambala trash-to-draw, conditional Option use, and Security play", () => {
    const card = getCompiledCard("BT26-104");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 2, cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } } },
    ]);
    const end = card?.effects?.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(end?.condition).toMatchObject({ kind: "youHave", filter: { kind: ["Digimon"] } });
    expect(end?.actions).toMatchObject([
      { kind: "UseOptionWithoutCost", payCost: false, from: ["hand"], cost: { kind: "suspend" } },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
