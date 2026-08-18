import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-107.js";
import "./EX1-029.js";
import "./EX1-030.js";
import "./EX1-031.js";

describe("EX1 Seraphimon recovery control deck", () => {
  it("turns each Recovery into one card and caps both inherited reactions once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-029", as: "magnaAngemonBase" },
          { card: "EX1-031", as: "angewomonHost", under: ["EX1-030"] },
        ],
        hand: [
          { card: "EX1-031", as: "seraphimon" },
          { card: "BT1-107", as: "holyWave" },
        ],
        deck: [
          { card: "BT1-011", as: "unrecovered" },
          { card: "BT1-010", as: "secondRecovery" },
          { card: "BT1-009", as: "firstRecovery" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", dp: 5000, as: "firstTarget" },
          { card: "BT1-010", dp: 5000, as: "secondTarget" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const startingDeckIds = new Set([
      s.inst("firstRecovery").instanceId,
      s.inst("secondRecovery").instanceId,
      s.inst("unrecovered").instanceId,
    ]);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("magnaAngemonBase").permanentId,
      instanceId: s.inst("seraphimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.sourceCardId === "EX1-030" && req.kind === "chooseTargets";
    });

    const dpDecision = s.decisions.at(-1)!.req;
    expect(new Set(dpDecision.options?.candidateInstanceIds)).toEqual(new Set([
      s.perm("firstTarget").permanentId,
      s.perm("secondTarget").permanentId,
    ]));
    expect(dpDecision.options?.candidateInstanceIds).not.toContain(
      s.perm("firstTarget").topCard.instanceId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: dpDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("secondTarget").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 1 &&
      s.state.memory === 7 &&
      s.perm("secondTarget").currentDP === 3000,
    );

    expect(s.perm("firstTarget").currentDP).toBe(5000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    // Seraphimon costs 4 to digivolve and inherited MagnaAngemon refunds exactly 1.
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("holyWave").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 2 &&
      s.state.players[0]!.trash.some(
        ({ instanceId }) => instanceId === s.inst("holyWave").instanceId,
      ),
    );

    // Holy Wave is exactly Recovery +1: the two separate recoveries moved two cards total.
    // The third starting deck card was the normal bonus draw from digivolving.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security.filter(
      ({ instanceId }) => startingDeckIds.has(instanceId),
    )).toHaveLength(2);
    expect(s.state.players[0]!.hand.filter(
      ({ instanceId }) => startingDeckIds.has(instanceId),
    )).toHaveLength(1);
    // MagnaAngemon and Angewomon are each once per turn, so the second Recovery neither
    // gains another memory nor applies another -2000 DP choice.
    expect(s.state.memory).toBe(1);
    expect(s.perm("secondTarget").currentDP).toBe(3000);
    expect(s.decisions.filter(({ req }) =>
      req.sourceCardId === "EX1-030" && req.kind === "chooseTargets"
    )).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
