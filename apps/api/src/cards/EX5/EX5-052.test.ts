import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-052.js";

describe("EX5-052 Makuramon", () => {
  it("draws then plays a unique Deva from hand into breeding", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
      },
    ]);
  });
  it("suspends all opposing Tamers with play cost 2 or less and inherits conditional Blocker", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn" && entry.actions?.[0]?.kind === "Restrict"),
    ).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "permanent",
          target: { count: "all", filter: { kind: ["Tamer"], playCostLte: 2 } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } }],
    });
  });
});
