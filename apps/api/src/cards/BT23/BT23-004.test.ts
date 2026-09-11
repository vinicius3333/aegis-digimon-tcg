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
            target: { filter: {}, count: 1, fromSelectionRef: "demimeramonGhost" },
            keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            target: { filter: {}, count: 1, fromSelectionRef: "demimeramonGhost" },
            keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
            duration: "untilOpponentTurnEnd",
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("grants both keywords to the chosen friendly Ghost when deleted on the opponent's turn and expires at that turn's end", async () => {
    const preferred: string[] = [];
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine(
      {
        0: {
          deck,
          hand: [{ card: "BT1-009" }],
          battleArea: [
            { card: "BT15-069", under: ["BT23-004"], as: "source", dp: 20_000 },
            { card: "BT20-063", as: "firstGhost" },
            { card: "BT20-067", as: "chosenGhost" },
            { card: "BT1-009", as: "nonGhost" },
          ],
          security: ["BT1-013", "BT1-027"],
        },
        1: {
          deck,
          hand: [{ card: "BT1-009" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [
            { card: "BT4-077", as: "opponentGhost" },
            { card: "BT1-010", as: "attacker", dp: 30_000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenGhost").permanentId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend the source through a real attack: only a suspended Digimon can be attacked back.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The inherited grant must start on the opponent's turn, so the source is deleted there
    // by the opponent's own attack rather than by an injected deletion.
    await advance(s.engine).waitForMainPhase(1);
    const sourcePermanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourcePermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourcePermanentId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Retaliation")).toBe(true);
    for (const alias of ["firstGhost", "nonGhost", "opponentGhost"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker"), alias).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Retaliation"), alias).toBe(false);
    }

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosenGhost"), "Retaliation")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does nothing when no friendly Ghost target exists, deleted through a real battle", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine(
      {
        0: {
          deck,
          hand: [{ card: "BT1-009" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [{ card: "BT15-069", under: ["BT23-004"], as: "source", dp: 20_000 }, "BT1-009"],
        },
        1: {
          deck,
          hand: [{ card: "BT1-009" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [
            { card: "BT4-077", as: "opponentGhost" },
            { card: "BT1-010", as: "attacker", dp: 30_000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    const sourcePermanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourcePermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourcePermanentId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    // The opponent's own Ghost is never a legal target for "1 of YOUR Digimon".
    expect(observe(s.engine).hasKeyword(s.perm("opponentGhost"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentGhost"), "Retaliation")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
