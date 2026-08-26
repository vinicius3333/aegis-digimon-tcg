import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-086.js";
import "./BT9-086.js";

describe("BT9-086 Kiyoshiro Higashimitarai", () => {
  it("matches catalog values and the memory, qualifying-draw, and security IR", () => {
    expect(getCardDefinition("BT9-086")).toMatchObject({
      colors: ["Blue"], kinds: ["Tamer"], playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking", sourceFilter: { or: [{ nameOrTrait: [{ tokens: ["Jellymon"], match: "name" }] }, { levelComparison: { op: "gte", value: 5 } }] }, actions: [{ kind: "Draw", amount: 1, optional: true, condition: { kind: "zoneCount", zone: "hand", value: 7 }, cost: { kind: "suspend" } }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("sets memory to 3 from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-086", as: "tamer" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(3);
  });

  it("draws by suspending on a qualifying attack only at 7 or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-086", as: "tamer" },
            { card: "BT9-021", as: "attacker" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
