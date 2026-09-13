import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-045.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-045 KingChessmon", () => {
  it("reduces its play cost at eight Chessmon in trash and deletes another Digimon to play one", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine", isSelfRef: true },
          actions: [{ mode: "reduceCost", amount: 8, condition: { kind: "youHave", count: 8 } }],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        trigger,
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeNames: ["KingChessmon"],
                nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
              },
              count: 1,
            },
            cost: {
              kind: "deleteOwn",
              target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            },
          },
        ],
      });
    }
  });

  it("deletes another Digimon and plays a Chessmon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-035", as: "victim" }],
          hand: [
            { card: "BT13-045", as: "king" },
            { card: "BT13-035", as: "playedPawn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playedPawn").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playedPawn").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
    expect(s.state.memory).toBe(-3);
  });

  it("reduces only its own hand play by 8 at eight trashed Chessmon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-045", as: "king" }],
          trash: Array.from({ length: 8 }, () => "BT13-035"),
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-045"));
    expect(s.state.memory).toBe(5);
  });

  it("pays the full play cost below eight trashed Chessmon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-045", as: "king" }],
          trash: [...Array.from({ length: 7 }, () => "BT13-035"), "BT13-044"],
        },
        1: { trash: Array.from({ length: 8 }, () => "BT13-035") },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-045"));
    expect(s.state.memory).toBe(-3);
  });

  it("when digivolving deletes another Digimon and plays a non-King Chessmon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-041", as: "base" },
            { card: "BT13-036", as: "victim" },
          ],
          hand: [
            { card: "BT13-045", as: "evolvingKing" },
            { card: "BT13-042", as: "bishop" },
            { card: "BT13-045", as: "retainedKing" },
          ],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolvingKing").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("bishop").instanceId),
    );
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolvingKing").instanceId);
    expect(s.perm("base").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("retainedKing").instanceId, s.inst("evolutionDraw").instanceId].sort(),
    );
    expect(s.state.memory).toBe(6);
  });

  it("cannot pay with itself, play another KingChessmon, or play a non-Chessmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-045", as: "king" }],
          hand: ["BT13-045", "BT13-044"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("king"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("uses the alternate level-5 Chessmon route for 3 and normal yellow/black routes for 4", async () => {
    for (const [base, expected, alternate] of [
      ["BT13-042", 1, true],
      ["BT13-041", 0, false],
      ["BT11-041", 0, false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT13-045", as: "king" }] },
      });
      if (!alternate) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("king").instanceId,
            alternateRequirementIndex: 0,
          }),
        ).toMatchObject({ ok: false });
      }
      s.state.memory = 4;
      const evolutionMaterialId1 = s.perm("base").topCard!.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("king").instanceId,
          ...(alternate ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId1));
      expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
      await settle(() => s.perm("base").topCard.cardId === "BT13-045");
      expect(s.state.memory).toBe(expected);
    }
  });
});
