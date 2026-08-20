import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-067.js";

describe("BT16-067", () => {
  it("optionally gives one of your Digimon 3000 DP by trashing a card", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
    }
  });

  it("draws when another of your Digimon is played as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Draw", amount: 1 }] }] });
  });
});
