import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-069.js";
import "../index.js";

describe("BT21-069 GulusGammamon", () => {
  it("preserves the Gammamon evolution route and residual-free coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gammamon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("uses a Gammamon bottom-stack cost to delete a level 4 or lower Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
      });
      expect(action).toMatchObject({
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        actions: [expect.objectContaining({ payCost: false })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      }),
    );
  });

  it("places a Gammamon from hand and deletes an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-069", as: "gulus" },
            { card: "BT21-010", as: "gammamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));

    const gulus = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-069");
    expect(gulus?.stack.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("also pays from trash during evolution and places the card at the true bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-069", as: "gulus", under: [{ card: "BT1-009", as: "existing" }] }],
          trash: [{ card: "BT21-010", as: "gammamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gulus"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("gulus").stack[0]?.instanceId).toBe(s.inst("gammamon").instanceId);
    expect(s.perm("gulus").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
  });

  it.each([
    ["declined", "BT21-010", true],
    ["nonmatching", "BT1-009", false],
  ] as const)("does not pay or delete when the cost is %s", async (_label, costCard, decline) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-069", as: "gulus" }], hand: [{ card: costCard, as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gulus"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not pay the cost when there is only a level 5 target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-069", as: "gulus" }], hand: [{ card: "BT21-010", as: "cost" }] },
        1: { battleArea: [{ card: "BT2-075", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gulus"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays itself from security for free and grants inherited Retaliation", async () => {
    const security = setupEngine({ 0: { security: [{ card: "BT21-069", as: "gulus" }] } });
    security.state.memory = 0;
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("gulus"));
    await settle(() => security.state.players[0]!.battleArea.length === 1);
    expect(security.state.memory).toBe(0);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT21-076", as: "host", under: [{ card: "BT21-069", as: "source" }] }] },
    });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Retaliation")).toBe(true);
  });
});
