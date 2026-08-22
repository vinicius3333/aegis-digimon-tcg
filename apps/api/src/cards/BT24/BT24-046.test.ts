import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_046 } from "./BT24-046.js";
import "../index.js";

describe("BT24-046 Garurumon", () => {
  it("suspends one opposing Digimon on both entry timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_046.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
  it("has inherited once-per-turn suspension while attacking", () => {
    expect(BT24_046.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });

  it("has Jamming and suspends an opponent Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-046", as: "garurumon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("garurumon"), "Jamming")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("garurumon"));
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("digivolves from Gabumon for cost 2 and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-069", as: "gabumon" }],
          hand: [{ card: "BT24-046", as: "garurumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.instanceId === s.inst("garurumon").instanceId);
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(3);
  });

  it("inherited suspension activates only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-047", as: "host", under: ["BT24-046"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });
});
