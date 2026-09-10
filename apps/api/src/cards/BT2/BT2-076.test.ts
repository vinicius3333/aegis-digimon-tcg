import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-076.js";

describe("BT2-076 Pumpkinmon", () => {
  it("draws 2, then lets its controller choose 1 card in hand to trash when its host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-079", as: "host", under: ["BT2-076"] }],
        hand: [{ card: "BT1-012", as: "existing" }],
        deck: [
          { card: "BT1-010", as: "firstDraw" },
          { card: "BT1-011", as: "secondDraw" },
        ],
      },
    });

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("existing").instanceId,
        s.inst("firstDraw").instanceId,
        s.inst("secondDraw").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("secondDraw").instanceId] },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("existing").instanceId,
      s.inst("firstDraw").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondDraw").instanceId)).toBe(true);
  });

  it("does not activate while Pumpkinmon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-076", as: "pumpkinmon" }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("pumpkinmon").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("activates when its host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20000 }] },
        1: {
          battleArea: [{ card: "BT2-079", as: "host", under: ["BT2-076"], suspended: true }],
          deck: [
            { card: "BT1-029", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.hand.length === 1);

    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("proves the legal purple stack and public host-deletion draw/trash lifecycle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT2-007", as: "egg" }],
          hand: [
            { card: "BT2-069", as: "level3" },
            { card: "BT2-074", as: "level4" },
            { card: "BT2-076", as: "pumpkinmon" },
            { card: "BT2-079", as: "host" },
            { card: "BT1-012", as: "existing" },
          ],
          deck: [
            { card: "BT1-010", as: "firstDraw" },
            { card: "BT1-011", as: "secondDraw" },
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
          ],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "attacker" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("secondDraw").instanceId);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    for (const alias of ["level3", "level4", "pumpkinmon", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.breeding!.topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: breedingPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("firstDraw").instanceId),
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("secondDraw").instanceId)).toBe(
      true,
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
