import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-060.js";

describe("BT6-060 Deputymon", () => {
  it("adds a Three Musketeers Digimon and cost-7 Option, then trashes the rest", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT6-060", as: "beelstar" }], deck: [{ card: "BT6-017", as: "musketeer" }, { card: "BT1-101", as: "option" }, { card: "BT1-010", as: "rest1" }, { card: "BT1-011", as: "rest2" }] },
    }, { autoSelectCards: true });
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstar").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("musketeer").instanceId, s.inst("option").instanceId]));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]));
  });

  it("keeps all four revealed identities visible through both toolbox choices", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT6-060", as: "deputymon" }],
        deck: [
          { card: "BT6-017", as: "musketeer" },
          { card: "BT1-101", as: "option" },
          { card: "BT1-010", as: "restOne" },
          { card: "BT1-011", as: "restTwo" },
        ],
      },
    });
    s.state.memory = 20;
    const visibleCards = [
      { instanceId: s.inst("musketeer").instanceId, cardId: "BT6-017" },
      { instanceId: s.inst("option").instanceId, cardId: "BT1-101" },
      { instanceId: s.inst("restOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("restTwo").instanceId, cardId: "BT1-011" },
    ];

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("deputymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const musketeerDecision = s.decisions.at(-1)!.req;
    expect(musketeerDecision.sourceCardId).toBe("BT6-060");
    expect(musketeerDecision.options?.visibleCards).toEqual(visibleCards);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: musketeerDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("musketeer").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" && latest.decisionId !== musketeerDecision.decisionId;
    });

    const optionDecision = s.decisions.at(-1)!.req;
    expect(optionDecision.sourceCardId).toBe("BT6-060");
    expect(optionDecision.options?.visibleCards).toEqual(visibleCards);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optionDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("option").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("musketeer").instanceId, s.inst("option").instanceId]),
    );
  });

  it("may digivolve into a Three Musketeers Digimon from hand for cost 6 ignoring requirements", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-060", as: "deputymon" }],
        hand: [{ card: "BT6-112", as: "beelstarmon" }],
        deck: ["BT6-001"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    const deputymonInstanceId = s.perm("deputymon").topCard!.instanceId;
    const effects = observe(s.engine).activatableEffects(s.perm("deputymon")) as { effectKey: string }[];
    const effectKey = effects.find((effect) => effect.effectKey.includes("digivolve-three-musketeers"))?.effectKey;

    expect(effectKey).toBeDefined();
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: deputymonInstanceId,
      effectKey: effectKey!,
    })).toEqual({ ok: true });
    await settle(() => s.perm("deputymon").topCard?.instanceId === s.inst("beelstarmon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("deputymon").stack.some((card) => card.instanceId === deputymonInstanceId)).toBe(true);
  });

  it("does not advertise the alternate digivolution without an eligible card in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-060", as: "deputymon" }],
        hand: ["BT6-061"],
      },
    });
    await s.ready();

    const effects = observe(s.engine).activatableEffects(s.perm("deputymon")) as {
      effectKey: string;
    }[];
    expect(effects.some((effect) => effect.effectKey.includes("digivolve-three-musketeers"))).toBe(
      false,
    );
  });
});
