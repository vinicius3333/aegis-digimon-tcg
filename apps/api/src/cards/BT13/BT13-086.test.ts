import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-086.js";

describe("BT13-086 BT13-086", () => {
  it("matches the printed cost reduction and play effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon: XT"] }] },
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 6,
              cost: {
                kind: "deleteOwn",
                target: { filter: { controller: "mine", kind: ["Digimon"], levels: [4] }, count: 1 },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ match: "name", tokens: ["Akihiro Kurata"] }],
            },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "digivolve",
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["ProtoGizmon"] }] },
            count: 1,
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-086", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-086");
  });
});
