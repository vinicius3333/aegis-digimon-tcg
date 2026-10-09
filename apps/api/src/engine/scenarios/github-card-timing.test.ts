import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("GitHub card timing regressions", () => {
  it("#5399: Cerberusmon can trash the first Titan Option and immediately use that exact card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-069", as: "base" }],
          hand: [
            { card: "BT26-074", as: "cerberus" },
            { card: "BT26-100", as: "option" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cerberus").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("option").instanceId,
      faceUp: true,
    });
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  it("#5400: a second Dark Field returns the first copy and preserves the new copy's identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074" }],
          hand: [{ card: "BT26-100", as: "new" }],
          security: [{ card: "BT26-100", as: "old", faceUp: true }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("new").instanceId })).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("old").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("new").instanceId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it.each([1, 2])(
    "#5411: after accepting and paying the cost, a hand with %s Jesmon cards permits no selection",
    async (copies) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-014", as: "savior" },
              { card: "BT1-009", as: "ally" },
            ],
            hand: [{ card: "BT6-016", as: "jesmon" }, ...(copies === 2 ? ["BT6-016"] : [])],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      const end = advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
      await settle();
      expect(s.perm("savior").topCard.cardId).toBe("BT20-014");
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const req = s.decisions.at(-1)!.req;
      expect(req.options?.min).toBe(0);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
      await end;
      expect(s.perm("ally").isSuspended).toBe(true);
      expect(s.perm("savior").topCard.cardId).toBe("BT20-014");
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("jesmon").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
