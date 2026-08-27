import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-062 Chuumon", () => {
  it("charges the hand trash cost and plays inherited Chuumon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ match: "name", tokens: ["Sukamon", "Etemon"] }],
              },
              count: 1,
            },
          },
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          condition: expect.objectContaining({ kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] }),
          target: expect.objectContaining({ count: 1 }),
        }),
      ],
    });
  });

  it("trashes a Sukamon from hand and returns one from trash when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-062", as: "chuu" }, "BT11-040"], trash: ["BT11-040"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062")).toBe(true);
  });
});
