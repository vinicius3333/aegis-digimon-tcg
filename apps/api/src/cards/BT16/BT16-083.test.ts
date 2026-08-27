import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-083.js";
import "../index.js";

describe("BT16-083", () => {
  it("returns all Tamers, optionally plays one from hand, and plays Ukkomon from trash on deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "Return", to: "hand", target: { count: "all" } },
        { kind: "PlayWithoutCost", payCost: false, optional: true, abortOnDecline: true },
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { controller: "mine" } } },
      ],
    });
  });

  it("deletes the lowest-level opponent Digimon and may hatch at end of turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          cost: { kind: "return", target: { count: 1 } },
          target: { filter: { superlative: "lowestLevel" } },
        },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, breeding: true, optional: true },
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[0]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]?.actions?.[0]).not.toHaveProperty("abortOnDecline");
  });

  it("returns a Digi-Egg cost before deleting the opponent's lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-083", as: "bigUkko" }], trash: [{ card: "BT1-001", as: "egg" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("bigUkko"));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("egg").instanceId)).toBe(false);
  });
});
