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
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-228 engine behavior", () => {
  it("adds an Ice-Snow and LIBERATOR from the reveal and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-228", as: "emblem" }],
          deck: [{ card: "BT1-032", as: "iceSnow" }, { card: "BT18-060", as: "liberator" }, "BT1-001"],
          battleArea: ["BT1-009", "BT1-037", "BT1-063", "BT1-088", "P-016", "ST6-03", "BT1-084"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("iceSnow").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-228")).toBe(true);
  });
});
