import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-010.js";
import "../index.js";

const CARD_ID = "EX10-010";

describe("EX10-010 BlackWarGreymon", () => {
  it("records the exact ACE facts, keywords, deletion boundary, and conditional effects", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      colors: ["Red", "Black"],
      level: 6,
      playCost: 7,
      dp: 12000,
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(
      compiled.effects
        ?.filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords ?? [])
        .map(({ keyword }) => keyword),
    ).toEqual(["Raid", "Reboot", "Blocker"]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 7 }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "permanent",
          while: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
        },
        {
          kind: "GrantImmunity",
          immuneFrom: "opponentDigimonEffects",
          duration: "permanent",
          while: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
        },
      ],
    });
  });

  it("deletes an opposing Digimon at play cost 7 but not one above the boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "EX10-008", as: "cost7" },
            { card: "BT5-082", as: "cost12" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost7").permanentId);
    const cost7Id = s.perm("cost7").permanentId;
    const cost12Id = s.perm("cost12").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost7Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost12Id);
  });

  it("uses the normal cost-4 evolution route and can delete an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-008", as: "base" }],
          hand: [{ card: CARD_ID, as: "ace" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").permanentId);
    const tamerId = s.perm("tamer").permanentId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ace").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(tamerId);
  });

  it("publishes Raid, Reboot, and Blocker as live shared keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
  });

  it("turns on at exactly 13000 DP and turns off immediately below the threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: { battleArea: [{ card: "BT5-082", as: "threshold", dp: 13000 }] },
    });
    await s.ready();

    expect(s.perm("source").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Option")).toBe(false);

    s.perm("threshold").baseDP = 12999;
    s.perm("threshold").currentDP = 12999;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });

  it("re-evaluates the continuous bonus and immunity when the qualifying Digimon leaves", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: { battleArea: [{ card: "BT5-082", as: "threshold", dp: 13000 }] },
    });
    await s.ready();
    const thresholdId = s.perm("threshold").permanentId;

    expect(s.perm("source").currentDP).toBe(15000);
    expect(await advance(s.engine).verb.deletePermanent([thresholdId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });
});
