import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-018.js";
import "./EX3-011.js";
import "./EX3-065.js";

describe("EX3-011 Lavogaritamon", () => {
  it("has its official identity and both printed evolution colors", () => {
    expect(getCardDefinition("EX3-011")).toMatchObject({
      cardId: "EX3-011",
      nameEn: "Lavogaritamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 3 },
        { color: "Black", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Rock Dragon"],
      rarity: "R",
      imageId: "EX3-011",
    });
  });

  it("publishes a sourced mandatory choice containing only opposing Digimon at 5000 DP or less", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-011", as: "lavogaritamon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "belowLimit" },
          { card: "BT1-013", as: "atLimit" },
          { card: "BT1-019", as: "aboveLimit" },
        ],
      },
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lavogaritamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
      min: number;
      max: number;
    };
    expect(s.decisions.at(-1)!.req).toMatchObject({
      sourceCardId: "EX3-011",
      options: { timing: "OnPlay", min: 1, max: 1 },
    });
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("belowLimit").permanentId, s.perm("atLimit").permanentId]),
    );
    expect(payload.visibleInstanceIds).toEqual(payload.candidateInstanceIds);
    expect(payload.candidateInstanceIds).not.toContain(s.perm("aboveLimit").permanentId);
  });

  it("deletes one opposing 5000 DP Digimon, preserves 6000 DP, and may play Hina from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-011", as: "lavogaritamon" },
            { card: "EX3-065", as: "hina" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "atLimit", dp: 5000 },
            { card: "BT1-010", as: "aboveLimit", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    const atLimitInstanceId = s.perm("atLimit").topCard.instanceId;
    const aboveLimitPermanentId = s.perm("aboveLimit").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lavogaritamon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === atLimitInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(aboveLimitPermanentId);
    expect(s.state.memory).toBe(4);
  });

  it("gains memory only once when Hina reactivates its Dragon carrier's On Play deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-011", as: "base" },
            { card: "EX3-065", as: "hina" },
          ],
          hand: [{ card: "BT2-018", as: "volcanicdramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 3000 },
            { card: "BT1-010", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hina").isSuspended);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("hina").isSuspended).toBe(true);
  });

  it("resets the inherited once-per-turn memory gain after public turn completion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-018", under: ["EX3-011"], as: "carrier" }],
          hand: [
            { card: "EX3-011", as: "firstDeletion" },
            { card: "EX3-011", as: "secondDeletion" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget", dp: 3000 },
            { card: "BT1-010", as: "secondTarget", dp: 3000 },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDeletion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const completeTurn = async (seat: 0 | 1): Promise<void> => {
      s.state.turnSeat = seat;
      s.state.memory = 0;
      const turn = s.engine.runOneTurn();
      await settle(() => mainPhase.isOpen && s.state.turnSeat === seat);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
    };
    await completeTurn(0);
    await completeTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 0;
    const nextControllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDeletion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextControllerTurn;
  });

  it("does not gain memory when the carrier has no On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["EX3-011"], as: "carrier", dp: 12_000 }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
  });

  it("allows the optional Hina play to be declined without moving it from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-011", as: "lavogaritamon" },
            { card: "EX3-065", as: "hina" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const hinaId = s.inst("hina").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lavogaritamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "EX3-011",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(hinaId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065")).toBe(false);
  });
});
