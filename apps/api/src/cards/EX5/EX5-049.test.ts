import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-049.js";

describe("EX5-049 GrapLeomon", () => {
  it("has Fortitude and returns an opposing Digimon at 4000 DP or less to deck bottom on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
  });
  it("inherits Piercing while it has Leomon in its name", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });
});
