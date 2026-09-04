import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-024.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-024 Shoemon", () => {
  it("reduces Puppet digivolution costs by 1 on your turn", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Puppet"] }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    }));
  it("inherits permanent -3000 DP to opposing Security Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifySecurityDP",
      amount: -3000,
      duration: "permanent",
    }));

  it("applies the inherited -3000 DP modifier to opposing Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["EX7-024"] }] },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });
});
