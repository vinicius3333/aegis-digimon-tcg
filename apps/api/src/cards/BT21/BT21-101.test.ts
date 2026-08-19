import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-101.js";

describe("BT21-101 Gaiamon", () => {
  it("verifies Blocker/Link +1, Appmon link windows, and the once-per-turn linked security cost", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }] }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Link",
        payCost: false,
        optional: true,
        source: {
          filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          from: ["hand", "digivolutionCards"],
        },
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked" });
    const nested = (yourTurn?.actions[0] as any).actions;
    expect(nested[0]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "opponent", zone: "security", position: "top" } },
      cost: {
        kind: "unsuspend",
        target: { filter: { isSelfRef: true }, isSelf: true },
        raw: "by unsuspending this Digimon",
      },
      abortOnDecline: true,
    });
  });
});
