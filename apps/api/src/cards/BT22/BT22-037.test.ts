import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-037.js";

describe("BT22-037 Chirinmon", () => {
  it("fires the security-trash -8000 effect only from the security discard seam and costs the top security card", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(security?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 } },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });
});
