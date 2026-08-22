import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-078.js";

describe("BT17-078 Omnimon", () => {
  it("keeps Blast DNA Digivolve, Raid, and Blocker as separate keyword clauses", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDNADigivolve" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
  });

  it("during DNA Digivolve returns the chosen opponent Digimon and every same-level Digimon", () => {
    for (const effect of [compiled.effects?.[3], compiled.effects?.[4]]) {
      expect(effect).toMatchObject({
        actions: [
          { kind: "SelectBind", condition: { kind: "isDnaDigivolving" }, target: { bindAs: "dnaReturnLevel", upTo: true } },
          { kind: "Return", to: "deckBottom", condition: { kind: "isDnaDigivolving" }, target: { count: "all", filter: { relativeTo: { attr: "level", op: "eq", selectionRef: "dnaReturnLevel" } } } },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        ],
      });
    }
  });

  it("keeps the post-return deletion independent of the DNA condition", () => {
    expect(compiled.effects?.[3]?.actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(compiled.effects?.[4]?.actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });
});
