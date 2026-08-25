import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-083.js";

describe("BT20-083 Omekamon", () => {
  it("has Blocker without granting an unprinted alternate name", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.flatMap((entry) => entry.actions)).not.toContainEqual(
      expect.objectContaining({ kind: "GrantStatic", grant: "name" }),
    );
  });

  it("limits the On Play Omnimon (X Antibody) digivolution to one or fewer security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      condition: { kind: "securityAtMost", value: 1 },
      ignoreRequirements: true,
      payCost: false,
    });
  });

  it("places the deleted card under a King Drasil_7D6 in the breeding area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { isSelf: true },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }],
      },
      position: "bottom",
    });
  });

  it("only plays Omekamon from this stack when the owner's security is removed", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const watcher = effect?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      payCost: false,
      cost: { kind: "suspend", target: { isSelf: true } },
    });
    expect(effect?.isBreeding).toBe(true);
  });
});
