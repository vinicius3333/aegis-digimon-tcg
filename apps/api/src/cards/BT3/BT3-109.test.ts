import { describe, expect, it } from "vitest";
import { EffectDuration, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT3-109.js";
import "../BT17/BT17-022.js";
import "../BT17/BT17-023.js";
import "../BT17/BT17-028.js";
import "./BT3-008.js";

describe("BT3-109 Back for Revenge!", () => {
  it("matches official metadata and registers fully covered IR", () => {
    expect(getCardDefinition("BT3-109")).toMatchObject({
      nameEn: "Back for Revenge!",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 2,
      effectText: expect.stringContaining("Any [On Play] effects"),
    });
    expect(compiled).toEqual(getCompiledCard("BT3-109"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("replays the deleted Digimon without activating its On Play effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-008", as: "target" }, "BT3-076"],
          hand: [{ card: "BT3-109", as: "option" }],
          deck: ["BT3-019", "BT3-016", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));
    const deckSize = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT3-008"));
    expect(s.state.players[0]!.deck).toHaveLength(deckSize);
  });

  it("follows a later digivolution and leaves its sources in trash (Q1147/Q2730)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-076", as: "target" }],
          hand: [
            { card: "BT3-109", as: "option" },
            { card: "BT3-080", as: "evolved" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT3-080");
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT3-080"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT3-076")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-076")).toBe(false);
  });
});

describe("BT3-109 Back for Revenge! — KB Q&A rulings", () => {
  const setupRevengeOn = (targetCardId: string, board: { 0?: SeatSpec; 1?: SeatSpec } = {}) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: targetCardId, as: "target" },
            { card: "BT3-076", as: "established" },
          ],
          hand: [{ card: "BT3-109", as: "option" }],
          ...board[0],
        },
        1: { security: ["BT3-067", "BT3-067", "BT3-067"], ...board[1] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    return s;
  };

  const playRevenge = async (s: ReturnType<typeof setupRevengeOn>) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));
  };

  const deleteAndAwaitReturn = async (s: ReturnType<typeof setupRevengeOn>, instanceId: string) => {
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId)!;
  };

  it("brings the Digimon back without any effect it had before deletion (Q1148)", async () => {
    const s = setupRevengeOn("BT3-076");
    s.state.memory = 4;
    await playRevenge(s);
    const instanceId = s.perm("target").topCard.instanceId;
    await advance(s.engine).verb.modifyDP(s.perm("target").permanentId, 2000, EffectDuration.UntilOpponentTurnEnd);
    expect(s.perm("target").currentDP).toBe(5000);

    const returned = await deleteAndAwaitReturn(s, instanceId);
    await advance(s.engine).recompute();
    expect(returned.currentDP).toBe(3000);

    await advance(s.engine).verb.deletePermanent([returned.permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("treats the returned Digimon as newly played, so it can't attack that turn (Q1149)", async () => {
    const s = setupRevengeOn("BT3-076");
    s.state.memory = 4;
    await playRevenge(s);
    const originalPermanentId = s.perm("target").permanentId;
    const returned = await deleteAndAwaitReturn(s, s.perm("target").topCard.instanceId);
    expect(returned.permanentId).not.toBe(originalPermanentId);
    expect(returned.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: returned.permanentId, target: { kind: "player" } })
        .ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("established").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("plays AncientGarurumon after Lobomon's slide carries the effect into the end-of-turn deletion (Q2761)", async () => {
    const s = setupRevengeOn("BT17-023", {
      0: {
        hand: [
          { card: "BT3-109", as: "option" },
          { card: "BT17-022", as: "lobomon" },
          { card: "BT17-028", as: "ancient" },
        ],
        deck: ["BT3-067", "BT3-067", "BT3-067"],
      },
    });
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    await playRevenge(s);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT17-028" && s.state.pendingDecision === undefined);
    const ancientInstanceId = s.inst("ancient").instanceId;
    const slidPermanentId = s.perm("target").permanentId;

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== slidPermanentId));

    const replayed = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId !== "BT3-076");
    expect(replayed.map((permanent) => permanent.topCard.instanceId)).toEqual([ancientInstanceId]);
    expect(replayed[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-022")).toBe(true);
  });
});
