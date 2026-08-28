import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-049.js";
import "../index.js";

const CARD_ID = "EX10-049";

describe("EX10-049 SkullSatamon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Fallen Angel"],
    });
  });

  it("proves thresholded delete sequencing and the inherited instead branch", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "both",
            amount: 3,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
          },
          {
            kind: "ConditionalBranch",
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            ifTrue: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }],
            ifFalse: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 3 } } } }],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          condition: { kind: "zoneCount", op: "gt", value: 10 },
        },
        { kind: "TrashTopDeck", controller: "both", amount: 2, condition: { kind: "zoneCount", op: "lte", value: 10 } },
      ],
    });
  });

  it("Q5395 skips milling above 10 but still deletes through the raised level-5 maximum", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "skull" }], deck: ["BT1-009", "BT1-010", "BT1-009"] },
        1: {
          battleArea: [
            { card: "EX10-030", as: "level5" },
            { card: "EX10-053", as: "level5b" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-009"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level5").permanentId);
    await s.ready();
    const deletedId = s.perm("level5").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("skull"));
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(deletedId);
  });

  it("mills at 8, re-evaluates 11 trash cards, and raises the deletion maximum to level 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "skull" }], deck: ["BT1-009", "BT1-010", "BT1-009"] },
        1: {
          battleArea: [{ card: "EX10-030", as: "level5" }],
          deck: ["BT1-009", "BT1-010", "BT1-009"],
          trash: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level5").permanentId);
    await s.ready();
    const deletedId = s.perm("level5").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("skull"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(12); // 8 existing + 3 milled + the deleted Digimon
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(deletedId);
  });

  it("Q5132 inherited branch mills instead at 10, but grants Security Attack +1 above 10", async () => {
    const low = setupEngine({
      0: { battleArea: [{ card: "EX10-053", as: "host", under: [{ card: CARD_ID }] }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 10 }, () => "BT1-009") },
    });
    await low.ready();
    await advance(low.engine).fireForPermanent(EffectTiming.OnUseAttack, low.perm("host"));
    expect(low.state.players[0]!.deck).toHaveLength(0);
    expect(observe(low.engine).keywordAmount(low.perm("host"), "SecurityAttack")).toBe(0);

    const high = setupEngine({
      0: { battleArea: [{ card: "EX10-053", as: "host", under: [{ card: CARD_ID }] }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 11 }, () => "BT1-009") },
    });
    await high.ready();
    await advance(high.engine).fireForPermanent(EffectTiming.OnUseAttack, high.perm("host"));
    await settle(() => observe(high.engine).keywordAmount(high.perm("host"), "SecurityAttack") === 1);
    expect(high.state.players[0]!.deck).toHaveLength(2);
    expect(observe(high.engine).keywordAmount(high.perm("host"), "SecurityAttack")).toBe(1);
  });
});
