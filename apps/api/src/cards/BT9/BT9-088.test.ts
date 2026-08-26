import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-088.js";
import "./BT9-088.js";

describe("BT9-088 Mimi Tachikawa & Joe Kido", () => {
  it("matches catalog values and the independent memory, battle-draw, and security IR", () => {
    expect(getCardDefinition("BT9-088")).toMatchObject({
      colors: ["Green", "Blue"], kinds: ["Tamer"], playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", condition: { kind: "youHave", filter: { suspended: true } } }, { kind: "GainMemory", condition: { kind: "opponentHas", filter: { suspended: true } } }] },
        { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { colors: ["Green", "Blue"] }, actions: [{ kind: "Draw", amount: 1, optional: true, cost: { kind: "suspend" } }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("independently gains memory for each player controlling a suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-088", as: "tamer" },
          { card: "BT1-028", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", suspended: true }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend and draw after a green or blue Digimon deletes in battle and survives", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-088", as: "tamer" },
            { card: "BT9-052", as: "attacker" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
