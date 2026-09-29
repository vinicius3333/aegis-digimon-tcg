import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT19/BT19-053.js";
import "../BT23/BT23-043.js";
import "./BT5-110.js";

describe("BT5-110 All Delete", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-110")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("returns the bound Omnimon with Q1399 rule teardown before deleting the board", () => {
    expect(runtimeCompiledCard("BT5-110")?.effects[0]?.actions).toMatchObject([
      expect.objectContaining({ kind: "SelectBind" }),
      expect.objectContaining({
        kind: "Return",
        target: expect.objectContaining({ fromSelectionRef: "omnimonSelected" }),
      }),
      expect.objectContaining({ kind: "Delete" }),
    ]);
  });

  it("returns an Omnimon, trashes its sources, and deletes every remaining Digimon and Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-086",
              as: "omnimon",
              under: [
                { card: "BT5-014", as: "bottom" },
                { card: "BT5-019", as: "upper" },
              ],
            },
            "BT5-059",
            "BT5-091",
          ],
          hand: [{ card: "BT5-110", as: "option" }],
        },
        1: { battleArea: ["BT5-086", "BT5-059", "BT5-091"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const omnimonTopId = s.perm("omnimon").topCard.instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(omnimonTopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("upper").instanceId]),
    );
  });

  it("may be declined without returning the Omnimon or deleting any Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-086", as: "omnimon", under: [{ card: "BT5-014", as: "source" }] },
            "BT5-059",
            "BT5-091",
          ],
          hand: [{ card: "BT5-110", as: "option" }],
        },
        1: { battleArea: ["BT5-059", "BT5-091"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const omnimonPermanentId = s.perm("omnimon").permanentId;
    const sourceId = s.inst("source").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === omnimonPermanentId)).toBe(true);
    expect(s.perm("omnimon").stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("omnimon").instanceId);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-110", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});

describe("BT5-110 All Delete — KB Q&A rulings", () => {
  it("deletes the user's own Digimon and Tamers along with the opponent's (Q1384)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-086", as: "omnimon" },
            { card: "BT5-059", as: "ownDigimon" },
            { card: "BT5-091", as: "ownTamer" },
          ],
          hand: [{ card: "BT5-110", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT5-059", as: "opponentDigimon" },
            { card: "BT5-091", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("ownDigimon").instanceId, s.inst("ownTamer").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("opponentDigimon").instanceId, s.inst("opponentTamer").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("omnimon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("omnimon").instanceId);
  });

  it("lets QueenBeemon place every Royal Base Digimon it hit into security after CannonBeemon saves itself (Q5304)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-086", as: "omnimon" }],
          hand: [{ card: "BT5-110", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT23-043", as: "cannon" },
            { card: "BT19-053", as: "queen" },
          ],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 10;
    await s.ready();
    const cannonId = s.perm("cannon").permanentId;
    const cannonInstanceId = s.perm("cannon").topCard.instanceId;
    const queenInstanceId = s.perm("queen").topCard.instanceId;

    const answered = new Set<string>();
    const answerOrderingWithCannonBeemonFirst = () => {
      for (const { seat, req } of s.decisions) {
        if (req.kind !== "orderTriggers" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        const keys = req.options?.triggerKeys ?? [];
        const preferred = keys.find((key) => key.includes(cannonId)) ?? keys[0];
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "orderTriggers", order: preferred === undefined ? [] : [preferred] },
        });
      }
    };

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      answerOrderingWithCannonBeemonFirst();
      return (
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)
      );
    });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("omnimon").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(
      s.state.players[1]!.security.slice(1).map((card) => ({ instanceId: card.instanceId, faceUp: card.faceUp })),
    ).toEqual(
      expect.arrayContaining([
        { instanceId: cannonInstanceId, faceUp: true },
        { instanceId: queenInstanceId, faceUp: true },
      ]),
    );
    expect(s.state.players[1]!.security).toHaveLength(3);
  });
});
