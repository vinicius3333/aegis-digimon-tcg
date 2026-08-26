import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-014.js";

describe("BT18-014 Gigasmon", () => {
  it("grants Rush to one of your Digimon on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          target: { filter: { controller: "mine", kind: ["Digimon"] } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    const s = setupEngine(
      { 0: { hand: [{ card: "BT18-014", as: "gigasmon" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigasmon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.state.players[0]!.battleArea[0]!);
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Rush")).toBe(true);
  });

  it("digivolves from Grumblemon for 1 and grants Rush at When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-012", as: "grumblemon" },
            { card: "BT1-030", as: "ally" },
          ],
          hand: [{ card: "BT18-014", as: "gigasmon" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("grumblemon").permanentId,
        instanceId: s.inst("gigasmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("grumblemon").topCard.cardId === "BT18-014");
    expect(s.state.memory).toBe(4);
    expect(s.perm("grumblemon").stack.at(-1)?.cardId).toBe("BT18-012");
    expect(
      [s.perm("grumblemon"), s.perm("ally")].filter((permanent) => observe(s.engine).hasKeyword(permanent, "Rush")),
    ).toHaveLength(1);
  });

  it("deletes at the exact 3000 DP boundary once per turn as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-014"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "first" },
            { card: "BT1-030", dp: 3000, as: "second" },
            { card: "BT1-030", dp: 4000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    await advance(s.engine).fireForInstance(EffectTiming.OnUseAttack, s.perm("host").topCard!);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(secondId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(largeId);
  });
});
