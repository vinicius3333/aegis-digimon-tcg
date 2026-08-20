import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-020.js";

describe("EX9-020", () => {
  it("has Blast Digivolve, Alliance, and Blocker and bottom-decks an opposing level 5 or lower Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }]));
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: { filter: { levelComparison: { op: "lte", value: 5 } } } });
  });
  it("DNA digivolves into Omnimon Alter-S when it would leave play and prevents attack target changes", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "DnaDigivolve", optional: true }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" });
  });
});
