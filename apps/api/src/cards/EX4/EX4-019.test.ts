import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-019.js";

describe("EX4-019 MachGaogamon", () => {
  it("returns an opposing Digimon of level four or lower", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } });
  });
  it("unsuspends itself when the opponent has at least eight cards in hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 } }] });
  });
});
