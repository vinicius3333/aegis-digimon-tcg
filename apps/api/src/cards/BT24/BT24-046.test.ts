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

  it("has Jamming and suspends an opponent Digimon through a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-046", as: "garurumon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-046")!;
    expect(observe(s.engine).hasKeyword(played, "Jamming")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["normal green requirement", "BT1-065", false, undefined, 3],
    ["Gabumon in name requirement", "BT2-069", true, 0, 2],
    ["TS requirement", "BT24-031", true, 1, 2],
  ])(
    "uses the %s and resolves When Digivolving",
    async (_label, baseCard, useAlternateCost, alternateRequirementIndex, expectedCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
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
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("garurumon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("garurumon").instanceId);
      await settle(() => s.perm("target").isSuspended);

      expect(s.state.memory).toBe(5 - expectedCost);
    },
  );

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
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });
});
