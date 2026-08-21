import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-045.js";

describe("BT20-045 Examon ACE", () => {
  it("keeps Blast DNA Digivolve in hand and returns highest-DP opposing Digimon only on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDNADigivolve" }] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "Return", condition: { kind: "isDnaDigivolving" }, to: "deckBottom", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: "all" } }] });
  });

  it("may unsuspend this battle-area Digimon when any Digimon suspends, once per turn", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "any", kind: ["Digimon"] }, actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true } }] }] });
  });
});
