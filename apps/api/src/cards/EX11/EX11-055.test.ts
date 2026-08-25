import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-055.js";

describe("EX11-055 Chitose Horaiji", () => {
  it("trashes a Composite card to draw and gain memory on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-055", as: "chitose" }, "AD1-006"], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chitose").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 2 && s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006"),
      600,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("repeats the paid draw and memory effect at the start of its owner's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-055", as: "chitose" }],
          hand: [{ card: "AD1-006", as: "payment" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("chitose"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("suspends after a Composite deletion and plays an exact Gazimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "AD1-006", as: "composite" },
          ],
          hand: [{ card: "BT10-071", as: "gazimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives.deletePermanent([s.perm("composite").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-071"));

    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gazimon").instanceId)).toBe(false);
  });

  it("publishes full compiled coverage with coupled payments and exact deletion filters", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", optional: true },
      { kind: "Draw", condition: { kind: "ifThisEffectActed" } },
      { kind: "GainMemory", condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { nameOrTrait: [{ tokens: ["Gazimon", "Gizamon"], match: "nameExact" }] } },
            cost: { kind: "suspend", target: { isSelf: true } },
          },
        ],
      },
    ]);
  });
});
