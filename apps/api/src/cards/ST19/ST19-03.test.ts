import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-03.js";

describe("ST19-03 Shoemon", () => {
  it("reveals three, adds one Puppet and one LIBERATOR, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-03", as: "shoemon" }],
          deck: [
            { card: "ST19-02", as: "puppet" },
            { card: "ST19-14", as: "liberator" },
            { card: "BT1-010", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("puppet").instanceId,
      s.inst("liberator").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("inherits the security-DP reduction for all opponent security Digimon", () => {
    expect(getCardDefinition("ST19-03")).toMatchObject({
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
    });
  });

  it("adds the only eligible card when the reveal has no second matching trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-03", as: "shoemon" }],
          deck: [
            { card: "ST19-02", as: "puppet" },
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("puppet").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("applies the inherited -3000 security-Digimon modifier from a real stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-10", as: "host", under: ["ST19-03"] }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });
});

describe("ST19-03 Shoemon — KB Q&A rulings", () => {
  function handIds(s: EngineSetup): string[] {
    return s.state.players[0]!.hand.map((card) => card.instanceId);
  }

  it("adds the single LIBERATOR card when no Puppet card is revealed (Q853)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-03", as: "shoemon" }],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "ST19-14", as: "liberator" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => handIds(s).includes(s.inst("liberator").instanceId));
    expect(handIds(s)).toEqual([s.inst("liberator").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("first").instanceId, s.inst("second").instanceId].sort(),
    );
  });

  it("must add both the Puppet and the LIBERATOR card when both are revealed (Q854)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST19-03", as: "shoemon" }],
        deck: [
          { card: "ST19-02", as: "puppet" },
          { card: "ST19-14", as: "liberator" },
          { card: "BT1-010", as: "rest" },
        ],
      },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });

    for (const alias of ["puppet", "liberator"]) {
      const wanted = s.inst(alias).instanceId;
      await settle(
        () =>
          s.state.pendingDecision?.kind === "selectCards" &&
          s.decisions.at(-1)?.req.options?.candidateInstanceIds?.includes(wanted),
      );
      const pending = s.state.pendingDecision!;
      expect(s.decisions.at(-1)!.req.options?.min).toBe(1);
      const declined = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      expect(declined.ok).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "selectCards", instanceIds: [wanted] },
        }),
      ).toEqual({ ok: true });
    }

    await settle(() => handIds(s).length === 2);
    expect(handIds(s)).toEqual([s.inst("puppet").instanceId, s.inst("liberator").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });
});
