import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-086.js";

describe("BT16-086", () => {
  it("plays itself from security and sets memory to 3 from 2 or less", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
  });

  it("models Mind Link and inherited Pulsemon protection", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [{ kind: "MindLink" }, { kind: "PlaceUnder" }],
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
    });
    expect(compiled.effects?.[2]?.actions?.[0]).not.toMatchObject({ target: { filter: { trait: ["Pulsemon"] } } });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Barrier" } } },
      ],
    });
  });

  it("can play a Hacker Judge from its digivolution cards as inherited", () => {
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
    });
  });
});
