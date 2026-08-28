import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-037.js";
import "../index.js";

const CARD_ID = "EX10-037";

describe("EX10-037 Impmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 3,
      playCost: 4,
      dp: 2000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
    });
  });

  it("proves direct deck-trash deletion, top-deck trash, and inherited trash scaling", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 10, unit: "trash" } }],
    });
  });

  it("Q5116 deletes only from a direct top-deck trash and respects the level-4 ceiling", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          deck: [
            { card: CARD_ID, as: "trashedImpmon" },
            { card: "BT1-009", as: "otherMill" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX10-028", as: "level4" },
            { card: "EX10-030", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level5").permanentId, s.perm("level4").permanentId);
    await s.ready();
    const level4Id = s.perm("level4").permanentId;
    const level5Id = s.perm("level5").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === level4Id));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("trashedImpmon").instanceId, s.inst("otherMill").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(level5Id);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], deck: [CARD_ID, "BT1-009"] },
        1: { battleArea: [{ card: "EX10-028", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    const targetId = declined.perm("target").permanentId;
    await advance(declined.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, declined.perm("source"));
    expect(declined.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
  });

  it("the inherited Your Turn buff scales by complete groups of 10 trash cards", async () => {
    const trash = Array.from({ length: 20 }, () => "BT1-009");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-030", as: "host", under: [{ card: CARD_ID, as: "impmon" }] }],
        trash,
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const base = getCardDefinition("EX10-030")!.dp!;
    expect(s.perm("host").currentDP).toBe(base + 2000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(base);
  });
});
