import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-054.js";

describe("EX6-054 Lucemon: Chaos Mode", () => {
  it("deletes an opposing Digimon/Tamer, or trashes security and grants Recovery when deletion fails", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", optional: true, controller: "opponent" },
      { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } },
      {
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "ifThisEffectDidNotDelete" },
      },
    ]));
  it("binds the optional Lucemon return cost to its own stack before the optional revival", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      optional: true,
      cost: {
        kind: "return",
        destination: "deck",
        position: "bottom",
        target: {
          filter: {
            zone: ["trash", "digivolutionCards"],
          },
          source: "thisDigimon",
        },
      },
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    }));
  it("publicly deletes an opposing Digimon on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-054", as: "chaos" }] }, 1: { battleArea: [{ card: "BT1-009", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("chaos"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
