import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const CARD_ID = "BT25-081";

describe("BT25-081 Fangmon", () => {
  it("keeps the purple Lv.3 evolution requirement and inherited Retaliation", () => {
    expect(getCardDefinition(CARD_ID)?.evoCosts).toEqual([{ color: "Purple", level: 3, memoryCost: 2 }]);
    expect(getCompiledCard(CARD_ID)?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
        }),
      ]),
    );
  });

  it("On Play suspends exactly one Tamer that has no purple color", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "fangmon" }],
          battleArea: [
            { card: "BT1-085", as: "ownRed" },
            { card: "BT8-093", as: "ownPurple" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT11-094", as: "opponentMixed" },
            { card: "BT8-093", as: "opponentPurple" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownRed").permanentId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownRed").isSuspended);

    expect(s.perm("ownRed").isSuspended).toBe(true);
    expect(s.perm("ownPurple").isSuspended).toBe(false);
    expect(s.perm("opponentMixed").isSuspended).toBe(false);
    expect(s.perm("opponentPurple").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("When Digivolving applies the same mandatory non-purple Tamer boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-078", as: "base" }],
          hand: [{ card: CARD_ID, as: "fangmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-086", as: "opponentBlue" },
            { card: "BT11-094", as: "opponentMixed" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentBlue").permanentId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fangmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID && s.perm("opponentBlue").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("opponentBlue").isSuspended).toBe(true);
    expect(s.perm("opponentMixed").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1); // Fangmon's All Turns effect sees the opponent Tamer suspend.
  });

  it("publicly rejects the ordinary route from a wrong-color level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "redSource" }], hand: [{ card: CARD_ID, as: "fangmon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redSource").permanentId,
        instanceId: s.inst("fangmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redSource").topCard.cardId).toBe("BT21-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fangmon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("gains 1 memory for an opponent Tamer suspension, only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "fangmon" }, { card: "BT8-093", as: "ownTamer" }] },
      1: {
        battleArea: [
          { card: "BT1-086", as: "firstTamer" },
          { card: "BT1-085", as: "secondTamer" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("ownTamer").permanentId]);
    expect(s.state.memory).toBe(0);
    await advance(s.engine).verb.suspend([s.perm("firstTamer").permanentId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.suspend([s.perm("secondTamer").permanentId]);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    const memoryAfterTurn = s.state.memory;
    await advance(s.engine).verb.unsuspend([s.perm("secondTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondTamer").permanentId]);
    expect(s.state.memory).toBe(memoryAfterTurn + 1);
  });

  it("grants inherited Retaliation through a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-083", as: "host", under: [CARD_ID] }],
      },
      1: { battleArea: [{ card: "BT25-085", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-083")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT25-085")).toBe(true);
  });
});
