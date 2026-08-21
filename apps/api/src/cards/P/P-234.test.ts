import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-234.js";

describe("P-234 Yujin Ozora", () => {
  it("reveals four cards and adds one supported trait", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 4,
            add: [
              expect.objectContaining({
                count: 1,
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["System", "Navi", "Tool", "Leviathan"], match: "trait" }],
                },
                to: "hand",
              }),
            ],
            rest: "deckBottom",
          }),
        ],
      }),
    );
  });

  it("links from hand after a link card is trashed, with the suspend cost and reduction", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinkTrashed",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "Link",
                from: ["hand"],
                costDelta: -2,
                recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("plays without cost from Security", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true }),
    );
  });
});
