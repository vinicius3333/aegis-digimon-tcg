import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_050 } from "./BT24-050.js";
import "../index.js";

describe("BT24-050 WereGarurumon", () => {
  it("unsuspends your Digimon and restricts an opposing Digimon or Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_050.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controller: "mine", kind: ["Digimon"] } },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
    }
  });
  it("keeps the inherited once-per-turn hand play filter", () => {
    const inherited = BT24_050.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).target.filter).toMatchObject({
      dp: { op: "lte", value: 4000 },
      excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
    });
  });

  it("has Evade, unsuspends an own Digimon, and locks an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-050", as: "weregarurumon" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "P-133", as: "tamer", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").topCard.instanceId, s.perm("tamer").topCard.instanceId);
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("weregarurumon"), "Evade")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weregarurumon"));

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });

  it("digivolves from Garurumon for cost 3 and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-046", as: "garurumon", suspended: true }],
          hand: [{ card: "BT24-050", as: "weregarurumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garurumon").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("garurumon").topCard.instanceId === s.inst("weregarurumon").instanceId);
    await settle(() => !s.perm("garurumon").isSuspended);

    expect(s.state.memory).toBe(2);
  });

  it("Q5640: inherited attack plays an eligible Beast but rejects Sea Animal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-051", as: "host", under: ["BT24-050"] }],
          hand: [
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-031", as: "beast" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("seaAnimal").instanceId, s.inst("beast").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("beast").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("seaAnimal").instanceId);
  });
});
