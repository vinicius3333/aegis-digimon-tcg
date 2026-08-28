import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-086.js";

describe("BT17-086 Leon Alexander", () => {
  it("plays from Security and gains memory when a Pulsemon-text Digimon exists", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
        },
      ],
    });
  });

  it("Mind Links to a Pulsemon-text Digimon only when no Tamer is already in its stack", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
          underFilter: { isSelfRef: true, position: "bottom", condition: { noTamerInDigivolution: true } },
        },
      ],
    });
  });

  it("grants inherited Blocker and Barrier, then can play Leon from the stack", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Barrier" } } },
      ],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
    });
  });
});
