import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-043.js";
import "../index.js";

const CARD_ID = "EX10-043";

describe("EX10-043 Sakusimon", () => {
  it("records the exact catalog and Link requirement", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Game"],
      types: ["Simulation", "Leviathan"],
      linkDp: 3000,
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
  });

  it("proves level-3 deletion and host-scoped link-trash memory", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("deletes exactly 1 opposing level-3 Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "sakusimon" }] },
        1: {
          battleArea: [
            { card: "EX10-040", as: "level3" },
            { card: "EX10-043", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").permanentId, s.perm("level3").permanentId);
    await s.ready();
    const level3Id = s.perm("level3").permanentId;
    const level4Id = s.perm("level4").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("sakusimon"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(level4Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(level3Id);
  });

  it("links only to Appmon for 2 and contributes +3000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "sakusimon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const base = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sakusimon").instanceId,
        targetPermanentId: s.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sakusimon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(base + 3000);
  });

  it("Q5123/Q5125 trashes itself or another same-host link to delete only level 4 or lower", async () => {
    for (const costAlias of ["sakusimon", "sameHost"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT21-009",
                as: "host",
                linked: [
                  { card: CARD_ID, as: "sakusimon" },
                  { card: "BT26-010", as: "sameHost" },
                ],
              },
              { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
            ],
          },
          1: {
            battleArea: [
              { card: "EX10-043", as: "level4" },
              { card: "EX10-053", as: "level5" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst(costAlias).instanceId, s.perm("level5").permanentId, s.perm("level4").permanentId);
      await s.ready();
      const level4Id = s.perm("level4").permanentId;
      const level5Id = s.perm("level5").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === level4Id));
      expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(level5Id);
      expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toContain(
        s.inst("neighborLink").instanceId,
      );
    }
  });

  it("Q5124 gains memory only for genuine same-host link trash and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: CARD_ID,
            as: "sakusimon",
            linked: [
              { card: "BT26-010", as: "first" },
              { card: "EX10-038", as: "second" },
            ],
          },
          { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("neighborLink").instanceId]);
    expect(s.state.memory).toBe(0);
    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);
    expect(s.state.memory).toBe(1);
  });
});
