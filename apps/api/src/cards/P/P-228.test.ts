import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-228.js";

describe("P-228 Unique Emblem: Frozen Crown", () => {
  it("reveals three, adds Ice-Snow and LIBERATOR cards, and places itself", () => {
    expect(
      runtimeCompiledCard("P-228")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.actions[0]?.kind === "RevealAdd",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
              },
            },
            {
              count: 1,
              to: "hand",
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
            },
          ],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("grants permanent Delay after a Suzune Kazuki is played", () => {
    expect(runtimeCompiledCard("P-228")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Suzune Kazuki"], match: "name" }] },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Delay", raw: "＜Delay＞" },
              duration: "permanent",
              target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            },
          ],
        },
      ],
    });
  });

  it("uses Delay to optionally digivolve into a level 6 or lower LIBERATOR at -3", () => {
    expect(
      runtimeCompiledCard("P-228")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 3,
          optional: true,
          target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          into: {
            controllerDefault: "mine",
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("activates its Main effects from security", () => {
    expect(runtimeCompiledCard("P-228")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
});
