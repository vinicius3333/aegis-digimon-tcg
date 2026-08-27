import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-056.js";

describe("BT15-056", () => {
  it("may place Shuu Yulin under itself to become immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", cost: { kind: "place" }, optional: true },
      ],
    }));
  it("once per turn suspends an opposing Digimon or Tamer with play cost no greater than this Digimon", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [{ kind: "Suspend", target: { filter: { playCostLteTriggerSource: true } } }],
        },
      ],
    }));
});
