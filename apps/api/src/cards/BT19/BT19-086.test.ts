import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-086 Ryo Akiyama", () => {
  it("places a Device and draws during a real turn after public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-086", as: "tamer" },
            { card: "BT19-098", as: "device" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    s.state.memory = 2;
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-098"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-098")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("preserves Device placement and draw, compound suspend/trash cost, optional Cyberdramon play, and Security play", () => {
    const card = runtimeCompiledCard("BT19-086");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            cost: {
              kind: "place",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                },
                count: 1,
                from: ["hand"],
              },
              destination: "battleArea",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "CostGatedBlock",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "compound",
              costs: [
                {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                {
                  kind: "deleteOwn",
                  target: {
                    filter: {
                      controller: "mine",
                      zone: "battleArea",
                      kind: ["Option"],
                      nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                    },
                    count: 4,
                  },
                },
              ],
            },
            actions: [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Cyberdramon"], match: "nameExact" }] },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
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

  it("keeps the bracketed Cyberdramon target name exact", () => {
    const reference = { tokens: ["Cyberdramon"], match: "nameExact" as const };

    expect(matchNameOrTrait({ nameEn: "Cyberdramon" }, reference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Cyberdramon (X Antibody)" }, reference)).toBe(false);
  });
});
