import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-066.js";

describe("EX7-066 Chaos Triangular", () => {
  it("gives +3000 DP when this digivolution card is discarded and waives its color requirement with a Three Musketeers Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      requireByEffect: true,
      actions: [{ kind: "ModifyDP", amount: 3000 }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ isInherited: true });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
  });
  it("deletes an opposing Digimon up to 9000 DP and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 9000 } } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));

  it("counts distinct Three Musketeers names for the Main deletion cap", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      dpCeilingScaling: {
        per: 1,
        unit: "distinctNames",
        filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] },
      },
    }));

  it("uses the Main effect through the Three Musketeers color waiver, then places itself under that Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [{ card: "EX7-048", as: "musketeer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.perm("musketeer").stack.map((card) => card.instanceId)).toContain(s.inst("chaos").instanceId);
  });

  it("raises the Main deletion cap for each distinct Three Musketeers name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [
            { card: "EX7-048", as: "gundramon" },
            { card: "EX7-059", as: "beelstarmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.stack.some((card) => card.instanceId === s.inst("chaos").instanceId),
      ),
    ).toBe(true);
  });

  it("does not raise the cap twice for two copies of the same Three Musketeers name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [
            { card: "EX7-048", as: "firstGundramon" },
            { card: "EX7-048", as: "secondGundramon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.stack.some((c) => c.cardId === "EX7-066")));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("victim").instanceId);
  });

  it("rejects the red Option when no Three Musketeers Digimon supplies the color waiver", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-066", as: "chaos" }], battleArea: [{ card: "EX7-046", as: "ordinary" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("chaos").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("adds 3000 DP when an effect trashes this Option from a digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX7-066", as: "chaos" }] }] },
    });
    const before = s.perm("host").currentDP;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("chaos").instanceId], 0);
    await settle(() => s.perm("host").currentDP === before + 3000);
    expect(s.perm("host").currentDP).toBe(before + 3000);
  });

  it("deletes an opponent's Digimon up to 12000 DP when revealed as Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-066", as: "chaos" }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 12000 }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("chaos"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
  });

  it("does not delete a Digimon above the Security DP limit", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-066", as: "chaos" }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 12001 }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("chaos"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("victim").instanceId);
  });
});
