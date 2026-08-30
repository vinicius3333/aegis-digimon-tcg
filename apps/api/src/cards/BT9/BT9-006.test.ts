import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-006.js";

function attackTarget(s: ReturnType<typeof setupEngine>, attackerAlias = "host") {
  return s.engine.applyIntent(0, {
    type: "attack" as const,
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "permanent" as const, permanentId: s.perm("target").permanentId },
  });
}

describe("BT9-006 Pagumon", () => {
  it("matches the catalog and complete inherited attack contract", () => {
    expect(getCardDefinition("BT9-006")).toMatchObject({
      cardId: "BT9-006",
      nameEn: "Pagumon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[When Attacking] You may trash 1 card in your hand to have this Digimon get +1000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "forTheTurn",
              cost: {
                kind: "trash",
                target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
                raw: "by trashing 1 card in your hand",
              },
              optional: true,
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  for (const [label, costCard] of [
    ["Tamer", "BT1-085"],
    ["Option", "BT1-089"],
  ] as const) {
    it(`may trash a ${label} card through a real attack and grants only its carrier +1000 DP`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-028", as: "host", under: ["BT9-006"] },
              { card: "BT1-028", as: "peer" },
            ],
            hand: [{ card: costCard, as: "cost" }],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      expect(attackTarget(s)).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.trash).toContainEqual(s.inst("cost"));
      expect(s.perm("host").currentDP).toBe(4000);
      expect(s.perm("peer").currentDP).toBe(3000);
    });
  }

  it("may refuse without paying the hand cost or receiving the DP bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-006"] }],
          hand: [{ card: "BT1-089", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    expect(attackTarget(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("cost"));
    expect(s.state.players[0]!.trash).not.toContainEqual(s.inst("cost"));
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("cannot pay with an empty hand and receives no DP bonus", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-006"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(attackTarget(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("keeps the inherited attack effect on a legal Pagumon-to-DemiDevimon stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT9-006", as: "pagumon" },
          hand: [
            { card: "BT2-067", as: "demidevimon" },
            { card: "BT1-089", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pagumon").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pagumon").topCard.instanceId === s.inst("demidevimon").instanceId);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("pagumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;

    expect(attackTarget(s, "pagumon")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("pagumon").stack.map((card) => card.cardId)).toContain("BT9-006");
    expect(s.perm("pagumon").currentDP).toBe(4000);
    expect(s.state.players[0]!.trash).toContainEqual(s.inst("cost"));
  });
});
