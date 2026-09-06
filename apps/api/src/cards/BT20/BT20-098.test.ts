import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-098.js";
import "./index.js";

describe("BT20-098 Apparition Legion", () => {
  it("matches the errata and applies Rush and Blocker to every Digimon it played", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    const play = main?.actions[0];
    const returnCost = play?.kind === "PlayPerLevel" ? play.cost : undefined;
    const keywordActions = main?.actions.slice(1);

    expect(returnCost).toMatchObject({
      kind: "return",
      target: { count: "all", totalLevels: 9 },
    });
    expect(returnCost?.target?.upTo).not.toBe(true);
    expect(keywordActions).toHaveLength(2);
    expect(keywordActions?.map((action) => action.kind)).toEqual(["GainKeyword", "GainKeyword"]);
    expect(keywordActions?.map((action) => irNode(action).keyword.keyword)).toEqual(["Rush", "Blocker"]);
    expect(keywordActions?.every((action) => irNode(action).target.count === "all")).toBe(true);
    expect(keywordActions?.every((action) => action.optional !== true)).toBe(true);
  });

  it("naturally pays exactly 9 returned opponent-trash levels and plays one Ghost at each level", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-098", as: "option" }],
          battleArea: ["BT20-062"],
          trash: [
            { card: "BT20-063", as: "ghost3" },
            { card: "BT20-079", as: "ghost6" },
          ],
        },
        1: {
          trash: ["BT20-062", "BT20-079"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const ids = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
      return ids.includes("BT20-063") && ids.includes("BT20-079");
    });

    expect(s.state.players[1]!.trash).toHaveLength(0);
    for (const alias of ["ghost3", "ghost6"] as const) {
      const permanent = s.perm(alias);
      expect(permanent.isSuspended).toBe(false);
    }
    expect(s.perm("ghost3").topCard.cardId).toBe("BT20-063");
    expect(s.perm("ghost6").topCard.cardId).toBe("BT20-079");
    for (const alias of ["ghost3", "ghost6"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
  });

  it("public Security check plays one qualifying Ghost from trash without cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
        1: { security: [{ card: "BT20-098", faceUp: true }], trash: [{ card: "BT20-063", as: "ghost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-063"));
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toContain("BT20-063");
  });
});
