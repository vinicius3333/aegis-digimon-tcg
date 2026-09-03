import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-081 Kiriha Aonuma", () => {
  it("places a Blue Flare card under itself during a real turn after public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-081", as: "tamer" },
            { card: "BT19-020", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toContain("BT19-020");
  });

  it("preserves hand placement for memory, any-Tamer DigiXros replacement, and Security play", () => {
    const card = runtimeCompiledCard("BT19-081");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            cost: {
              kind: "place",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Blue Flare", "Xros Heart"], match: "trait" }],
                },
                count: 1,
              },
              underFilter: { controller: "mine", kind: ["Tamer"] },
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
              hasDigiXrosRequirements: true,
            },
            actions: [
              {
                kind: "PlaceUnder",
                target: { filter: { controller: "mine", zone: "underTamer" }, count: "all", upTo: true },
                underFilter: { isTriggerSource: true },
                asDigiXrosMaterial: true,
                cost: {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                optional: true,
              },
            ],
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
          },
        ],
      },
    ]);
  });
});
