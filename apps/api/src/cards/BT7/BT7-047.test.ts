import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "./BT7-047.js";
import "./BT7-089.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-088.js";
import "../BT13/BT13-007.js";
import "../BT19/BT19-085.js";

describe("BT7-047 MetalKabuterimon", () => {
  it("digivolves onto a green Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-089", as: "base" }], hand: [{ card: "BT7-047", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-047");
  });

  it("suspends an opposing 6000-DP-or-less Digimon with a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-046", as: "base" }], hand: [{ card: "BT7-047", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

async function digivolveTamer(
  board: BoardSpec,
  memory: number,
  options: SetupEngineOptions = { autoSelectCards: true },
) {
  const s = setupEngine(board, options);
  s.state.memory = memory;
  await s.ready();
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("tamer").permanentId,
    instanceId: s.inst("metalKabuterimon").instanceId,
  });
  if (result.ok) await settle(() => s.perm("tamer").topCard.cardId === "BT7-047");
  await settle();
  return { s, result };
}

describe("BT7-047 MetalKabuterimon — KB Q&A rulings", () => {
  it("treats the Tamer as a digivolving Digimon for digivolve triggers and can't-digivolve effects (Q1580)", async () => {
    const triggered = await digivolveTamer(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "tamer" },
            { card: "BT19-085", as: "henry" },
          ],
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      2,
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(triggered.result).toEqual({ ok: true });
    expect(triggered.s.perm("henry").isSuspended).toBe(true);
    expect(triggered.s.perm("target").isSuspended).toBe(true);

    const blocked = await digivolveTamer(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          breeding: { card: "BT13-007" },
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
      },
      2,
    );
    expect(blocked.result.ok).toBe(false);
    expect(blocked.s.perm("tamer").topCard.cardId).toBe("BT1-088");
    expect(blocked.s.state.memory).toBe(2);
    expect(blocked.s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-047"]);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q1581)", async () => {
    const { s, result } = await digivolveTamer(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER],
        },
      },
      2,
    );
    expect(result).toEqual({ ok: true });
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("can't attack the turn it digivolves from a Tamer played this turn (Q1582)", async () => {
    const attackAfterDigivolving = async (enteredThisTurn: boolean) => {
      const { s, result } = await digivolveTamer(
        {
          0: {
            battleArea: [{ card: "BT1-088", as: "tamer", enteredThisTurn }],
            hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
            deck: [...FILLER],
          },
          1: { security: 2, deck: [...FILLER] },
        },
        2,
      );
      expect(result).toEqual({ ok: true });
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "player" },
      });
    };

    expect((await attackAfterDigivolving(true)).ok).toBe(false);
    expect(await attackAfterDigivolving(false)).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves play (Q1583)", async () => {
    const { s, result } = await digivolveTamer(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 10000, suspended: true }] },
      },
      2,
    );
    expect(result).toEqual({ ok: true });
    const tamerInstanceId = s.perm("tamer").stack[0]!.instanceId;
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT1-088"]);

    const permanentId = s.perm("tamer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-088", "BT7-047"]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === tamerInstanceId)).toBe(true);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q1584)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-047", as: "metalKabuterimon", under: [{ card: "BT7-089", as: "sourceTamer" }] }],
          security: [{ card: "BT7-089", as: "securityTamer" }, "BT1-013"],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: [...FILLER] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    const tamersInPlay = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT7-089");
    expect(tamersInPlay.map((permanent) => permanent.topCard.instanceId)).toEqual([s.inst("securityTamer").instanceId]);
    expect(s.perm("metalKabuterimon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sourceTamer").instanceId,
    ]);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q1585)", async () => {
    const securityAfterBattle = async (tamerCardId: string) => {
      const { s, result } = await digivolveTamer(
        {
          0: {
            battleArea: [{ card: tamerCardId, as: "tamer" }],
            hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
            deck: [...FILLER],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "defender", dp: 3000, suspended: true }],
            security: ["BT1-009", "BT1-009"],
            deck: [...FILLER],
          },
        },
        2,
      );
      expect(result).toEqual({ ok: true });
      const defenderInstanceId = s.perm("defender").topCard.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("tamer").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === defenderInstanceId));
      await settle();
      return s.state.players[1]!.security.length;
    };

    expect(await securityAfterBattle("BT7-089")).toBe(1);
    expect(await securityAfterBattle("BT1-088")).toBe(2);
  });

  it("can't declare it without a Digimon or green Tamer to digivolve, and a declared Tamer digivolution can't be backed out of (Q4646)", async () => {
    const noValidBase = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-009", as: "redRookie" },
          ],
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
      },
      { autoSelectCards: true },
    );
    noValidBase.state.memory = 2;
    await noValidBase.ready();
    expect([...noValidBase.inst("metalKabuterimon").digivolveTargetPermanentIds]).toEqual([]);
    for (const base of ["redTamer", "redRookie"]) {
      const result = noValidBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: noValidBase.perm(base).permanentId,
        instanceId: noValidBase.inst("metalKabuterimon").instanceId,
      });
      expect(result.ok).toBe(false);
    }
    expect(noValidBase.state.memory).toBe(2);
    expect(noValidBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-047"]);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          hand: [{ card: "BT7-047", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect([...s.inst("metalKabuterimon").digivolveTargetPermanentIds]).toEqual([s.perm("tamer").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("metalKabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT7-047");
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("tamer").topCard.cardId).toBe("BT7-047");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT1-088"]);
    expect(s.state.memory).toBe(0);
  });
});
