import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-239.js";

describe("P-239 DemiDevimon", () => {
  it("has Blocker", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
  });

  it("places itself under a Myotismon-text Digimon before optional hand digivolution", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            from: ["hand"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
            }),
          }),
        ],
      }),
    );
  });

  it("trashes a hand card to delete an opposing level 4 or lower Digimon", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "trash",
              target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
            }),
          }),
        ],
      }),
    );
  });
});
