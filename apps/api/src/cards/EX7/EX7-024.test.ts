import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-024.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
  it("inherits permanent -3000 DP to all opposing Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "permanent",
      target: { count: "all" },
    }));

  it("applies the inherited -3000 DP modifier to opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["EX7-024"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();
    await settle(() => s.perm("opponent").currentDP === 0);
    expect(s.perm("opponent").currentDP).toBe(0);
  });
});
