import { describe, it, expect } from "vitest";
import { Zone } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

const P_048 = "P-048";
const BASE_BLUE_LV5 = "BT1-038";
const FILLER_1 = "AD1-001";
const FILLER_2 = "AD1-002";
const FILLER_3 = "AD1-003";

describe("P-048 UlforceVeedramon Zero — [When Digivolving] unsuspend", () => {
  it("unsuspends the Digimon after paying 3 non-DigiEgg from trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_BLUE_LV5, as: "basePerm", dp: 4000, suspended: true },
            { card: "BT1-086", as: "tamer", suspended: true },
          ],
          hand: [{ card: P_048, as: "p048" }],
          trash: [FILLER_1, FILLER_2, FILLER_3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const basePerm = s.perm("basePerm");
    const baseSourceInstanceId = basePerm.topCard.instanceId;

    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p048").instanceId,
        permanentId: basePerm.permanentId,
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const perm = p0.battleArea.find((p) => p.permanentId === basePerm.permanentId);
      return perm !== undefined && !perm.isSuspended && !s.perm("tamer").isSuspended && s.state.memory === 1;
    }, 400);

    const perm = p0.battleArea.find((p) => p.permanentId === basePerm.permanentId);
    expect(perm).toBeDefined();
    expect(perm?.isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(perm!.stack.some((card) => card.instanceId === baseSourceInstanceId)).toBe(true);

    const another = s.give(0, Zone.Trash, "BT1-009");
    await (
      s.engine as unknown as {
        primitives: { returnToDeck(ids: string[]): Promise<unknown> };
      }
    ).primitives.returnToDeck([another.instanceId]);
    await settle();
    expect(s.state.memory).toBe(1);
  });

  it("does not unsuspend when trash has fewer than 3 non-DigiEgg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_BLUE_LV5, as: "basePerm", dp: 4000, suspended: true }],
          hand: [{ card: P_048, as: "p048" }],
          trash: [FILLER_1, FILLER_2],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const basePerm = s.perm("basePerm");

    s.state.memory = 4;

    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("p048").instanceId,
      permanentId: basePerm.permanentId,
    });

    await settle(
      () => p0.battleArea.find((p) => p.permanentId === basePerm.permanentId)?.topCard?.cardId === P_048,
      200,
    );

    expect(p0.deck.length).toBe(0);
    expect(s.perm("basePerm").isSuspended).toBe(true);
    expect(p0.trash).toHaveLength(2);
  });

  it("may decline to return the 3 cards and leaves both permanents suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_BLUE_LV5, as: "basePerm", suspended: true },
            { card: "BT1-086", as: "tamer", suspended: true },
          ],
          hand: [{ card: P_048, as: "p048" }],
          trash: [FILLER_1, FILLER_2, FILLER_3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p048").instanceId,
        permanentId: s.perm("basePerm").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("basePerm").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("gains memory once when an AeroVeedramon Zero stack returns 3 cards while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: P_048, as: "ulforce" },
            { card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] },
          ],
          trash: [
            { card: "BT1-009", as: "trash-a" },
            { card: "BT1-010", as: "trash-b" },
            { card: "BT1-011", as: "trash-c" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const baseDp = s.perm("attacker").baseDP;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.perm("attacker").currentDP === baseDp + 2000);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 2000);
    assertNoLoudGap(s);
  });

  it("resets the trash-return memory trigger on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: P_048, as: "ulforce" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const returnToDeck = (instanceId: string) =>
      (
        s.engine as unknown as { primitives: { returnToDeck(ids: string[]): Promise<unknown> } }
      ).primitives.returnToDeck([instanceId]);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);

    await returnToDeck(trashIds[0]!);
    await settle(() => s.state.memory === 1 && s.state.pendingDecision === undefined);
    await returnToDeck(trashIds[1]!);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const beforeThird = s.state.memory;
    await returnToDeck(trashIds[2]!);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(beforeThird + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
