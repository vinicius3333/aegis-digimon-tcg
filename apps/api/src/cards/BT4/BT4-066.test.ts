import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST7/ST7-12.js";
import "./BT4-066.js";

describe("BT4-066 Golemon", () => {
  it("gives itself and all of your other black Digimon +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-066", as: "gole" },
          { card: "BT4-067", as: "other" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("gole").currentDP).toBe(s.perm("gole").baseDP + 1000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP + 1000);
  });

  it("does not give DP to a non-black Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-066", as: "gole" },
          { card: "BT4-057", as: "nonBlack" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("nonBlack").currentDP).toBe(s.perm("nonBlack").baseDP);
  });
});

describe("BT4-066 Golemon — KB Q&A rulings", () => {
  it("cannot choose more Digimon for [Atomic Blaster] after deleting [Golemon] lowers the other black Digimon's DP (Q694)", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT4-066", as: "golemon" },
          { card: "ST5-02", as: "blackAlly" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.maxTotalDP).toBe(8000);
    expect(s.perm("golemon").currentDP + s.perm("blackAlly").currentDP).toBe(9000);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("golemon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("blackAlly").currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("blackAlly").permanentId,
    ]);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });

  it("gives [Golemon] itself +1000 DP, but not the opponent's black Digimon (Q1221)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-066", as: "golemon" }] },
      1: { battleArea: [{ card: "ST5-02", as: "opponentBlack" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("golemon").baseDP).toBe(3000);
    expect(s.perm("golemon").currentDP).toBe(4000);
    expect(s.perm("opponentBlack").currentDP).toBe(s.perm("opponentBlack").baseDP);
  });
});
