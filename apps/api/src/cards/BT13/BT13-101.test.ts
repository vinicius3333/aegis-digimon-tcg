import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-101.js";

describe("BT13-101 Miki Kurosaki & Megumi Shirakawa", () => {
  it("may play a PawnChessmon from hand without paying", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["PawnChessmon"] }] }, count: 1 } });
  });

  it("requires a two-color black/yellow Digimon and suspending this Tamer before draw and memory", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as { sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], multicolor: true, colors: ["Yellow", "Black"] } });
    expect(watcher.actions?.[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, cost: expect.objectContaining({ kind: "suspend" }), abortOnDecline: true });
    expect(watcher.actions?.[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } });
  });
});
