import { describe, expect, it } from "vitest";
import { compiled as chaosMode } from "./BT18-082.js";
import { compiled as zanbamon } from "./BT18-085.js";
import { compiled as larva } from "./BT18-086.js";
import { compiled as owen } from "./BT18-087.js";
import { compiled as violet } from "./BT18-093.js";
import { compiled as devastation } from "./BT18-096.js";

describe("BT18 targeted late-set fidelity checks", () => {
  it("uses the bottom security card for Lucemon: Chaos Mode's replacement", () => {
    expect(chaosMode.effects?.[2]?.actions?.[0]).toMatchObject({ actions: [{ cost: { kind: "trash", target: { filter: { zone: "security", position: "bottom" } } } }] });
  });

  it("reduces only digivolutions into Zanbamon", () => {
    expect(zanbamon.effects?.[0]?.actions?.[0]).toMatchObject({ into: { nameOrTrait: [{ tokens: ["Zanbamon"], match: "nameExact" }] } });
  });

  it("requires a non-white Lucemon Digimon for Larva's protection", () => {
    expect(larva.effects?.[2]?.actions?.[0]).toMatchObject({ while: { filter: { excludeColors: ["White"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } } });
  });

  it("only reacts when the opponent's security is removed", () => {
    expect(owen.effects?.[1]?.actions?.[0]).toMatchObject({ event: "whenSecurityRemoved", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" } });
  });

  it("accepts either an Option or a Ghost/Three Musketeers card as Violet's cost", () => {
    expect(violet.effects?.[1]?.actions?.[0]).toMatchObject({ cost: { target: { filter: { or: [{ kind: ["Option"] }, { nameOrTrait: [{ tokens: ["Ghost", "Three Musketeers"], match: "trait" }] }] } } } });
  });

  it("scales Lord of Devastation and Rebirth memory by cards actually placed", () => {
    expect(devastation.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "GainMemory", scaling: { usePaidCount: true, per: 1 } });
  });
});
