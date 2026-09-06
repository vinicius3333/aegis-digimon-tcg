import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT15/BT15-069.js";
import { compiled } from "./BT23-004.js";

describe("BT23-004 DemiMeramon", () => {
  it("matches the catalog and binds both inherited grants to one Ghost", () => {
    expect(getCardDefinition("BT23-004")).toMatchObject({
      cardId: "BT23-004",
      nameEn: "DemiMeramon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Flame", "LIBERATOR"],
      inheritedEffectText:
        "[On Deletion] 1 of your Digimon with the [Ghost]\u00a0trait gains ＜Blocker＞ and ＜Retaliation＞ until your opponent's turn ends.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "SelectBind",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
              },
              count: 1,
              bindAs: "demimeramonGhost",
            },
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: "demimeramonGhost" },
            keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: "demimeramonGhost" },
            keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
            duration: "untilOpponentTurnEnd",
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("grants both keywords to exactly the chosen friendly Ghost and keeps them through the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT15-069", under: ["BT23-004"], as: "source", suspended: true },
            { card: "BT20-063", as: "firstGhost" },
            { card: "BT20-067", as: "chosenGhost" },
            { card: "BT1-009", as: "nonGhost" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT4-077", as: "opponentGhost" },
            { card: "BT1-010", as: "attacker", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenGhost").permanentId);

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    const sourcePermanentId = s.perm("source").permanentId;
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourcePermanentId),
    );

    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Retaliation")).toBe(true);
    for (const alias of ["firstGhost", "nonGhost", "opponentGhost"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker"), alias).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Retaliation"), alias).toBe(false);
    }

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Retaliation")).toBe(false);
  });

  it("does nothing when no friendly Ghost target exists", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT23-004"], as: "source" }, "BT1-009"] },
      1: { battleArea: ["BT4-077"] },
    });

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("public breeding evolution preserves source and pays 0", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        breeding: { card: "BT23-004", as: "egg" },
        hand: [{ card: "BT15-069", as: "candlemon" }],
        battleArea: [{ card: "BT20-063", as: "ghost" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 3000 }] },
    });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("candlemon").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("candlemon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("candlemon").instanceId);
    expect(s.perm("egg").stack.map(({ cardId }) => cardId)).toEqual(["BT23-004"]);
    expect(s.perm("egg").topCard.cardId).toBe("BT15-069");
    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });
});
