import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-015.js";
import "../index.js";

describe("BT24-015 MetalGreymon", () => {
  it("plays itself from security without battling when the opponent has a level 6+ Digimon", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security")?.actions?.[0] as any;
    expect(security).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
      withoutBattle: true,
    });
    expect(security.condition).toMatchObject({
      kind: "opponentHas",
      filter: { levelComparison: { op: "gte", value: 6 } },
    });
  });

  it("keeps lowest-DP attack-target-change deletion and inherited Blocker deletion", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns") as any;
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttackTargetSwitched" });
    expect(allTurns.actions[0].actions[0].target.filter.superlative).toBe("lowestDP");
    expect(inherited.actions[0].target.filter.keywords).toEqual(["Blocker"]);
  });

  it("plays itself from security without battling against a level 6 Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-015", as: "metalGreymon", faceUp: true }] },
      1: { battleArea: [{ card: "BT24-017", as: "level6" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("metalGreymon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-015"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("metalGreymon").instanceId,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not play itself from security against only level 5 or lower Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-015", as: "metalGreymon", faceUp: true }] },
      1: { battleArea: [{ card: "BT24-014", as: "level5" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("metalGreymon"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("metalGreymon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("deletes one lowest-DP opponent Digimon when an attack target changes, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-015", as: "metalGreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest1", dp: 3000 },
            { card: "BT1-009", as: "lowest2", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("metalGreymon").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("metalGreymon").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("higher").permanentId,
    );
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(1);
  });

  it("deletes only an opposing Digimon with Blocker when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-015"] }] },
        1: {
          battleArea: [
            { card: "BT24-012", as: "blocker" },
            { card: "BT24-011", as: "nonBlocker" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonBlocker").permanentId,
    ]);
  });

  it("exposes Blocker and digivolves from a level 4 TS Digimon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-015", as: "metalGreymon" },
          { card: "BT24-011", as: "tsBase" },
        ],
        hand: [{ card: "BT24-015", as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("metalGreymon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
