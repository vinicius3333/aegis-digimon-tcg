import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-057.js";

describe("EX4-057 Antylamon", () => {
  it("adds a suspended other Digimon's DP and Security Attack plus one when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "AddDPFromSuspendedCost",
      optional: true,
      dpSource: { kind: "suspendedTarget" },
      cost: { kind: "suspend", target: { filter: { controller: "mine", excludeSelf: true } } },
      alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
  });
  it("plays a green level three from trash and returns a green Digimon once per turn", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "EndOfAttack");
    expect(effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { colors: ["Green"], levels: [3] } },
    });
    expect(effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { zone: "trash", colors: ["Green"] } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-057");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-057");
});
