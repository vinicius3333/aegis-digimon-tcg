import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-038.js";
import "../index.js";

describe("BT22-038 Monzaemon", () => {
  it("scales Ver.1-to-Monzaemon digivolution cost and shares the once-per-turn removal/lock reaction", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(replacement?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Monzaemon"], match: "name" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
    const triggered = compiled.effects.filter(
      (entry) => entry.trigger === "WhenDigivolving" || entry.trigger === "WhenAttacking",
    );
    expect(triggered[0]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "SelectBind",
          cost: { kind: "trash" },
        },
        { kind: "ModifyDP", amount: -4000 },
        { kind: "DisableTimingEffect", timings: ["whenDigivolving"] },
      ],
    });
    expect(triggered[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "SelectBind",
          cost: { kind: "trash" },
        },
        { kind: "ModifyDP", amount: -4000 },
        { kind: "DisableTimingEffect", timings: ["whenDigivolving"] },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited && entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("implements Q4884-Q4889 by reducing for face-down sources, paying one, and locking one target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "EX9-050",
            as: "numemon",
            under: [
              { card: "BT1-001", faceUp: false },
              { card: "BT1-002", faceUp: false },
            ],
          }],
          hand: [{ card: "BT22-038", as: "monzaemon" }],
        },
        1: { battleArea: [{ card: "BT22-052", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("numemon").permanentId,
      instanceId: s.inst("monzaemon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving"));
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(8000);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-001" || card.cardId === "BT1-002")).toHaveLength(1);
  });
});
