import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-044.js";

describe("BT18-044 FunBeemon", () => {
  it("places the exact Royal Base card from hand at security bottom and adds the prior top card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-044", as: "funbeemon" },
            { card: "BT18-046", as: "royalBase" },
          ],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === s.inst("royalBase").instanceId);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-046");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-046")).toBe(false);
    assertNoLoudGap(s);
  });

  it("may decline without changing hand or security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-044", as: "funbeemon" }],
          hand: [{ card: "BT18-046", as: "royalBase" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("funbeemon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("royalBase").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it.each([
    [true, 5000],
    [false, 4000],
  ])("face-up security=%s gives Royal Base Digimon %i DP", async (faceUp, expectedDp) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-046", as: "royalBase" }],
        security: [{ card: "BT18-044", as: "securityFunBeemon", faceUp }],
      },
    });
    await s.ready();

    expect(s.perm("royalBase").currentDP).toBe(expectedDp);
    assertNoLoudGap(s);
  });

  it("digivolves from a level 2 Royal Base for 0 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-004", as: "puroromon" }],
        hand: [{ card: "BT18-044", as: "funbeemon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puroromon").permanentId,
        instanceId: s.inst("funbeemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("puroromon").topCard?.instanceId === s.inst("funbeemon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("puroromon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-004"]);
    assertNoLoudGap(s);
  });

  it("grants its inherited host +1000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "host", under: [{ card: "BT18-044", as: "source" }] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
