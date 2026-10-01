import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-055.js";
import "./BT4-030.js";

describe("BT4-030 Beowolfmon", () => {
  it("cannot be attacked on the opponent's turn with a Hybrid card underneath", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-016"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("beowolfmon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not prevent attacks without a Hybrid card or blue Tamer underneath", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-029"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(false);
  });

  it("also recognizes a blue Tamer in the evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-093"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(true);
  });
});

describe("BT4-030 Beowolfmon — KB Q&A rulings", () => {
  function beowolfmonBoard(sources: string[], turnSeat: 0 | 1, suspended = true) {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: sources, suspended }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = turnSeat;
    return s;
  }

  it("cannot be chosen as an attack target by the opponent's Digimon while the condition is met (Q1195)", async () => {
    const s = beowolfmonBoard(["BT4-016"], 1);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("beowolfmon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const ownTurn = beowolfmonBoard(["BT4-016"], 0);
    await ownTurn.engine.recomputeContinuousEffects();
    expect(observe(ownTurn.engine).isRestricted(ownTurn.perm("beowolfmon"), "cantBeAttacked")).toBe(false);
  });

  it("can still block with ＜Blocker＞ and battle the attacker normally (Q1196)", async () => {
    const s = beowolfmonBoard(["BT14-055", "BT4-016"], 1, false);
    await s.engine.recomputeContinuousEffects();
    const beowolfmonId = s.perm("beowolfmon").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(true);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: beowolfmonId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));

    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === beowolfmonId)?.isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("is protected only by a [Hybrid] Digimon card or a blue Tamer card in its digivolution cards (Q1197)", async () => {
    const cases: { source: string; protectedFromAttacks: boolean }[] = [
      { source: "BT4-016", protectedFromAttacks: true },
      { source: "BT4-093", protectedFromAttacks: true },
      { source: "BT1-085", protectedFromAttacks: false },
      { source: "BT4-029", protectedFromAttacks: false },
    ];
    for (const { source, protectedFromAttacks } of cases) {
      const s = beowolfmonBoard([source], 1);
      await s.engine.recomputeContinuousEffects();
      expect({ source, blocked: observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked") }).toEqual({
        source,
        blocked: protectedFromAttacks,
      });
      const outcome = s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("beowolfmon").permanentId },
      });
      expect({ source, accepted: outcome.ok }).toEqual({ source, accepted: !protectedFromAttacks });
    }
  });
});
