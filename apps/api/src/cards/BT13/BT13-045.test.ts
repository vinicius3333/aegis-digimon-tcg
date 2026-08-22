import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-045.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-045 KingChessmon", () => {
  it("reduces its play cost at eight Chessmon in trash and deletes another Digimon to play one", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine", isSelfRef: true },
          actions: [{ mode: "reduceCost", amount: 8, condition: { kind: "youHave", count: 8 } }],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        trigger,
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeNames: ["KingChessmon"],
                nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
              },
              count: 1,
            },
            cost: {
              kind: "deleteOwn",
              target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            },
          },
        ],
      });
    }
  });

  it("deletes another Digimon and plays a Chessmon from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-035", as: "victim" }], hand: [{ card: "BT13-045", as: "king" }, "BT13-035"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });
});
