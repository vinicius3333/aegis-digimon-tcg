import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-033.js";
describe("BT4-033 ZeedGarurumon", () => {
  it("uses one cost-bearing Return so Q1399 teardown cannot fire source-trash watchers", () => {
    const whenDigivolving = runtimeCompiledCard("BT4-033")!.effects.find(
      (effect) => effect.trigger === "WhenDigivolving",
    )!;
    expect(whenDigivolving.actions).toMatchObject([
      {
        kind: "Return",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        to: "hand",
        cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } },
      },
    ]);
  });

  it("Digi-Bursts 2 to return a level 5 Digimon and trash its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT4-033", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT3-015", under: [{ card: "BT1-011", as: "source" }], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const opp = s.state.players[1] as PlayerState;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.hand.some((c) => c.cardId === "BT3-015"));
    expect(opp.trash.some((c) => c.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it("does not return an opposing level 6 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT4-033", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-025", as: "target", under: [{ card: "BT1-011", as: "source" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    const targetId = s.perm("target").permanentId;
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-033", 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.perm("target").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.perm("base").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
