import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-022.js";
import "../index.js";

describe("BT24-022 Ikkakumon", () => {
  it("trashes two stack cards, then restricts an opponent Digimon by source stack count", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[1].target.filter.digivolutionCardsCompareToSource).toBe("lte");
    }
  });

  it("keeps the inherited unsuspend-to-draw condition", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const sub = inherited.actions[0];
    expect(sub).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended" });
    expect(sub.actions[0].condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "hand",
      op: "lte",
      value: 7,
    });
  });

  it("trashes the top two sources before applying the source-count suspension restriction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-022", as: "ikkakumon", under: ["BT24-020"] }] },
        1: {
          battleArea: [
            {
              card: "BT24-022",
              as: "threeSources",
              under: ["BT24-019", "BT24-020", "BT24-021"],
            },
            { card: "BT24-022", as: "twoSources", under: ["BT24-019", "BT24-020"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("threeSources").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ikkakumon"));

    expect(s.perm("threeSources").stack).toHaveLength(1);
    expect(s.perm("twoSources").stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "suspend")).toBe(false);
  });

  it("exposes Jamming and inherited draw only at seven or fewer cards, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-022", as: "ikkakumon" },
          { card: "BT24-022", as: "host", under: ["BT24-022"] },
        ],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ikkakumon"), "Jamming")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw with eight cards already in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-022"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-021", as: "tsBase" }],
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
