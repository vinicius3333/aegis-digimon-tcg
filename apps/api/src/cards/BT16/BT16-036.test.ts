import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-036.js";

describe("BT16-036", () => {
  it("models Barrier, Blocker, Partition, and the Boss/D-Brigade traits", () => {
    expect(compiled.effects?.[0]).toMatchObject({ keywords: [{ keyword: "Barrier" }, { keyword: "Blocker" }, { keyword: "Partition" }], actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Boss", "D-Brigade"] }] });
  });

  it("DNA digivolves for free and applies its When Digivolving effects", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", actions: [{ kind: "DnaDigivolve", payCost: false, optional: true }] });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: -8000, duration: "forTheTurn" });
  });

  it("trashes the top card of both security stacks at opponent-turn end", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfOpponentsTurn", actions: [{ kind: "Trash" }, { kind: "Trash" }] });
  });
});
