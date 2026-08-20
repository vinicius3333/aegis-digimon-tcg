import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-087.js";

describe("BT16-087", () => {
  it("plays itself from security and sets memory to 3 from 2 or less", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Security", actions: [{ kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] });
  });

  it("models Mind Link and inherited Piercing/Blocker", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", keywords: [{ keyword: "Mind Link" }], actions: [{ kind: "MindLink" }, { kind: "PlaceUnder" }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } }] });
  });

  it("can play Kosuke Kisakata from its digivolution cards as inherited", () => {
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }] });
  });
});
