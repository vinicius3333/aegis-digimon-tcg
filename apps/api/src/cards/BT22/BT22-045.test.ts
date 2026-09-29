import { describe, expect, it } from "vitest";
import { setupEngine, settle, type CardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-045.js";
import "./index.js";
import "../BT10/BT10-011.js";

describe("BT22-045 WezenGammamon", () => {
  it("uses the Gammamon hand card as the cost for Blocker and +3000 DP", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
            from: ["hand"],
          },
        },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      });
    }
  });

  it("retains inherited Piercing", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toMatchObject([{ keyword: "Piercing" }]);
  });

  it("places a Gammamon from hand, gains Blocker, and reaches 8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-045", as: "wezen" },
            { card: "BT8-008", as: "gammamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wezen").instanceId })).toEqual({ ok: true });
    await settle();
    const wezen = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-045")!;

    expect(wezen.stack.some((card) => card.cardId === "BT8-008")).toBe(true);
    expect(wezen.currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(wezen, "Blocker")).toBe(true);
  });

  it("gets neither Blocker nor DP when the Gammamon cost is unavailable", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-045", as: "wezen" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wezen").instanceId })).toEqual({ ok: true });
    await settle();
    const wezen = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-045")!;

    expect(wezen.currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(wezen, "Blocker")).toBe(false);
  });
});

describe("BT22-045 WezenGammamon — KB Q&A rulings", () => {
  function digivolveIntoCanoweissmon(options: { hand: CardSpec[]; under?: CardSpec[]; preferredAlias?: string }) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-045", as: "wezenGammamon", under: options.under ?? [] }],
          hand: [{ card: "BT10-011", as: "canoweissmon" }, ...options.hand],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    if (options.preferredAlias !== undefined) preferred.push(s.inst(options.preferredAlias).instanceId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wezenGammamon").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("does not activate the [When Digivolving] effect of a Gammamon card placed by the effect Canoweissmon gained (Q4897)", async () => {
    const s = digivolveIntoCanoweissmon({
      hand: [
        { card: "BT22-045", as: "placedWezenGammamon" },
        { card: "BT8-008", as: "remainingGammamon" },
      ],
      preferredAlias: "placedWezenGammamon",
    });
    await settle();

    const canoweissmon = s.perm("wezenGammamon");
    expect(canoweissmon.topCard.cardId).toBe("BT10-011");
    expect(canoweissmon.stack.map((card) => card.instanceId)).toEqual([
      s.inst("placedWezenGammamon").instanceId,
      expect.any(String),
    ]);
    expect(canoweissmon.currentDP).toBe(11_000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("remainingGammamon").instanceId]);

    const alreadyUnder = digivolveIntoCanoweissmon({
      hand: ["BT8-008", "BT8-008"],
      under: ["BT22-045"],
    });
    await settle();
    expect(alreadyUnder.perm("wezenGammamon").currentDP).toBe(14_000);
    expect(alreadyUnder.state.players[0]!.hand).toHaveLength(0);
  });
});
