import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-013.js";
import "../index.js";

describe("EX4-013 MedievalGallantmon", () => {
  it("has the official identity and routes the Security clause through the security timing", () => {
    expect(getCardDefinition("EX4-013")).toMatchObject({
      cardId: "EX4-013",
      nameEn: "MedievalGallantmon",
      colors: ["Red", "Green"],
      level: 6,
      playCost: 13,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Warrior"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("plays from security without cost and arms an end-of-turn return", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions).toEqual([
      expect.objectContaining({
        kind: "PlayWithoutCost",
        from: ["security"],
        payCost: false,
        withoutBattle: true,
      }),
      expect.objectContaining({
        kind: "SubTrigger",
        event: "endOfTurn",
        once: true,
        actions: [
          expect.objectContaining({
            kind: "Return",
            to: "hand",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          }),
        ],
      }),
    ]);
  });

  it.each([
    ["red", "EX4-009"],
    ["green", "EX4-036"],
  ])("digivolves from a %s level-5 Digimon for 4", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-013", as: "medieval" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medieval").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-013");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
  });
  it("falls back to suspending an opponent Digimon when the 6000 DP deletion fails", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Suspend",
        preventUnsuspend: "opponentNextUnsuspendPhase",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
    }
  });

  it("deletes an opposing Digimon at or below 6000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-013", as: "medieval" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("medieval"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q3451 can choose an already suspended Digimon and prevent its next unsuspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-013", as: "medieval" }] },
        1: {
          security: ["BT1-001"],
          battleArea: [{ card: "BT1-009", as: "target", dp: 7000, suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medieval").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("target").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("plays without security battle, then returns the played Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
        1: { security: [{ card: "EX4-013", as: "medieval" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const medievalId = s.inst("medieval").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === medievalId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === medievalId)).toBe(false);

    await advance(s.engine).fireSubTrigger("endOfTurn");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === medievalId)).toBe(true);
  });

  it("Q3450 leaves the card in trash when the security-played Digimon is deleted before end of turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX4-013", as: "medieval" }] } }, { autoSelectCards: true });
    const medievalId = s.inst("medieval").instanceId;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("medieval"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === medievalId));
    expect({
      battle: s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId),
      hand: s.state.players[0]!.hand.map((card) => card.instanceId),
      security: s.state.players[0]!.security.map((card) => card.instanceId),
      trash: s.state.players[0]!.trash.map((card) => card.instanceId),
    }).toEqual({ battle: [medievalId], hand: [], security: [], trash: [] });
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === medievalId)!;
    await advance(s.engine).verb.deletePermanent([played.permanentId], "byEffect");
    await advance(s.engine).fireSubTrigger("endOfTurn");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === medievalId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === medievalId)).toBe(true);
  });
});
