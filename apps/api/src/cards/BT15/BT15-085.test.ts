import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-085.js";

describe("BT15-085", () => {
  it("sets memory to 3 at the start of the turn when memory is 2 or less", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] }));
  it("may redirect an opponent attack to a suspended Insectoid by suspending this Tamer", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", cost: { kind: "suspend" }, optional: true }] }] }));
  it("plays itself from security", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
});
