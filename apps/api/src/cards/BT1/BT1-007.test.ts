import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-007.js";
import "./BT1-078.js";

describe("BT1-007 Tanemon", () => {
  it("gives +1000 DP when attacking after its Digimon digivolved that turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-068", as: "base", dp: 3000, under: ["BT1-007"] }],
        hand: [{ card: "BT1-074", as: "evolving" }],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.to === "hand"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-007"));
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 1000);
  });

  it("does not count a digivolution in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-068", as: "host", dp: 3000, under: ["BT1-007"] }],
        breeding: { card: "BT1-009", as: "breedingBase" },
        hand: [{ card: "BT1-015", as: "breedingEvolution" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("breedingEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.instanceId === s.inst("breedingEvolution").instanceId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("counts a battle-area digivolution performed by Jagamon's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-078", as: "host", under: ["BT1-007"] }],
          deck: [{ card: "BT1-081", as: "evolution" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
