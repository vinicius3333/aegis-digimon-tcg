import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../BT13/BT13-007.js";
import "./BT12-012.js";
import "./BT12-088.js";

describe("BT12-012 Agunimon", () => {
  it("digivolves from Takuya for 2 with a bonus draw and preserves the Tamer as a source", async () => {
    expect(digivolutionRequirementsFor("BT12-012")).toContainEqual({
      names: ["Takuya Kanbara"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-012", as: "agunimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");
    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer evolution route from a non-Takuya Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-089", as: "takato" }], hand: [{ card: "BT12-012", as: "agunimon" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takato").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("digivolves from BurningGreymon for the alternate cost of 1", async () => {
    expect(digivolutionRequirementsFor("BT12-012")).toContainEqual({
      names: ["BurningGreymon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-013", as: "burning" }], hand: [{ card: "BT12-012", as: "agunimon" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard.cardId === "BT12-012");
    expect(s.state.memory).toBe(9);
    expect(s.perm("burning").stack.map(({ cardId }) => cardId)).toContain("BT12-013");
  });

  it("may play Flamemon suspended on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-012", as: "aguni" }], hand: [{ card: "BT12-009", as: "flame" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("aguni").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-009"));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-009");
    expect(played?.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("can decline the suspended Flamemon play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-012", as: "aguni" }], hand: [{ card: "BT12-009", as: "flame" }] } },
      { autoSelectCards: true },
    );
    let deletionSettled = false;
    void advance(s.engine)
      .verb.deletePermanent([s.perm("aguni").permanentId])
      .then(() => {
        deletionSettled = true;
      });
    await settle(() => {
      const pending = s.state.pendingDecision;
      if (pending?.kind === "optional") {
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: false },
        });
      }
      return deletionSettled;
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("flame").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("may play Takuya for free from the inherited On Deletion effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "host", under: ["BT12-012"] }],
          hand: [{ card: "BT12-088", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-088"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT12-088");
    expect(s.state.memory).toBe(0);
  });
});

describe("BT12-012 Agunimon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveFromTakuya(s: EngineSetup, tamerAlias = "takuya") {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst("agunimon").instanceId,
      useAlternateCost: true,
    });
  }

  it("cannot back out of a declared Tamer digivolution, and cannot declare one without a valid Tamer (Q4651)", async () => {
    const withoutTakuya = setupEngine({
      0: {
        battleArea: [{ card: "BT12-089", as: "takato" }],
        hand: [{ card: "BT12-012", as: "agunimon" }],
        deck: [...FILLER],
      },
    });
    withoutTakuya.state.memory = 10;
    expect(digivolveFromTakuya(withoutTakuya, "takato")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(withoutTakuya.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-012"]);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT12-012", as: "agunimon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");

    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual(["BT12-088"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("agunimon").instanceId);
  });

  it.fails("treats the Tamer as a digivolving Digimon for digivolve watchers and for Digimon can't-digivolve locks (Q6536)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-088", as: "takuya" },
              { card: "BT1-010", as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [
              { card: "BT12-012", as: "agunimon" },
              { card: "BT1-018", as: "champion" },
            ],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const digimonControl = boardWithTakumiAiba();
    expect(
      digimonControl.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: digimonControl.perm("rookie").permanentId,
        instanceId: digimonControl.inst("champion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT1-018");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(3);

    const watched = boardWithTakumiAiba();
    expect(digivolveFromTakuya(watched)).toEqual({ ok: true });
    await settle(() => watched.perm("takuya").topCard.cardId === "BT12-012");
    await settle();
    expect(watched.perm("takumi").isSuspended).toBe(true);
    expect(watched.state.players[0]!.hand).toHaveLength(3);

    const locked = setupEngine({
      0: {
        breeding: "BT13-007",
        battleArea: [
          { card: "BT12-088", as: "takuya" },
          { card: "BT1-010", as: "rookie" },
        ],
        hand: [
          { card: "BT12-012", as: "agunimon" },
          { card: "BT1-018", as: "champion" },
        ],
        deck: [...FILLER],
      },
    });
    locked.state.memory = 10;
    await locked.ready();
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("rookie").permanentId,
        instanceId: locked.inst("champion").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(digivolveFromTakuya(locked)).toMatchObject({ ok: false });
    expect(locked.perm("takuya").topCard.cardId).toBe("BT12-088");
    expect(locked.state.memory).toBe(10);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6537)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-012", as: "agunimon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
      },
    });
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("takuya").topCard.cardId).toBe("BT12-012");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6538)", async () => {
    function boardWithTakuya(enteredThisTurn: boolean) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya", enteredThisTurn }],
          hand: [{ card: "BT12-012", as: "agunimon" }],
          deck: [...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      });
      s.state.memory = 10;
      return s;
    }

    const fresh = boardWithTakuya(true);
    expect(digivolveFromTakuya(fresh)).toEqual({ ok: true });
    await settle(() => fresh.perm("takuya").topCard.cardId === "BT12-012");
    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(fresh.perm("takuya").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = boardWithTakuya(false);
    expect(digivolveFromTakuya(established)).toEqual({ ok: true });
    await settle(() => established.perm("takuya").topCard.cardId === "BT12-012");
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("takuya").isSuspended).toBe(true);
  });

  it("trashes the Tamer digivolution card with the Digimon when it leaves the field (Q6539)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT12-012", as: "agunimon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    const takuyaCard = s.perm("takuya").topCard.instanceId;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([takuyaCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("takuya").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([takuyaCard, s.inst("agunimon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6540)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT12-012", as: "agunimon" }],
          security: [{ card: "BT12-088", as: "securityTakuya" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");
    await s.ready();
    expect(s.perm("takuya").currentDP).toBe(7000);

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("takuya"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual(["BT12-088"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTakuya"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTakuya").topCard.cardId).toBe("BT12-088");
  });
  it("gains the inherited effects of a Tamer in its digivolution cards (Q6541)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-012", as: "agunimon" }],
        deck: [...FILLER],
      },
    });
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");
    await s.ready();
    expect(s.perm("takuya").currentDP).toBe(7000);

    async function attackWithTakuyaUnder(baseDP: number) {
      const board = setupEngine({
        0: {
          battleArea: [{ card: "BT12-012", as: "agunimon", dp: baseDP, under: ["BT12-088"] }],
          deck: [...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      });
      board.state.memory = 3;
      await board.ready();
      expect(
        board.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: board.perm("agunimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => board.state.players[1]!.security.length === 2);
      await settle();
      return board;
    }

    const boosted = await attackWithTakuyaUnder(8000);
    expect(boosted.perm("agunimon").currentDP).toBe(10000);
    expect(boosted.state.memory).toBe(5);

    const belowThreshold = await attackWithTakuyaUnder(7000);
    expect(belowThreshold.perm("agunimon").currentDP).toBe(9000);
    expect(belowThreshold.state.memory).toBe(3);
  });
});
