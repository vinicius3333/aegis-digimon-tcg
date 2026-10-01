import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-091.js";
import "../BT12/BT12-088.js";
import "../BT13/BT13-007.js";
import "./BT18-090.js";
import { compiled } from "./BT18-049.js";

describe("BT18-049 Zephyrmon", () => {
  it("gives exactly one own Digimon +3000 DP on play and has Piercing", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      { trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }] },
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Piercing" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-049", as: "zephyrmon" }], battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephyrmon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    const zephyrmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT18-049")!;
    expect(observe(s.engine).hasPierce(zephyrmon)).toBe(true);
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it.each([
    ["Zoe Orimoto", "BT18-090", 3, 2],
    ["Kazemon", "BT18-048", 1, 4],
  ])("digivolves from %s for the named cost and preserves the source", async (_name, baseCard, _cost, memoryLeft) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-049", as: "zephyrmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zephyrmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-049");

    expect(s.state.memory).toBe(memoryLeft);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
    assertNoLoudGap(s);
  });

  it("gives exactly one friendly Digimon +3000 DP when digivolving", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-048", as: "base" },
            { card: "BT1-030", as: "target" },
          ],
          hand: [{ card: "BT18-049", as: "zephyrmon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zephyrmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);

    expect([s.perm("base").currentDP, s.perm("target").currentDP].sort((a, b) => a - b)).toEqual([6000, 7000]);
    expect(s.perm("opponent").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("grants inherited Piercing only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT18-049"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT18-049 Zephyrmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveFromZoe(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("zoe").permanentId,
      instanceId: s.inst("zephyrmon").instanceId,
      useAlternateCost: true,
    });
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2979)", async () => {
    function digivolveRookie(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("champion").instanceId,
      });
    }
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-090", as: "zoe" },
              { card: "BT1-010", as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [
              { card: "BT18-049", as: "zephyrmon" },
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
    expect(digivolveRookie(digimonControl)).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT1-018");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(3);

    const fromTamer = boardWithTakumiAiba();
    expect(digivolveFromZoe(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("zoe").topCard.cardId === "BT18-049");
    await settle();
    expect(fromTamer.state.memory).toBe(7);
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-018"]);

    const locked = setupEngine(
      {
        0: {
          breeding: "BT13-007",
          battleArea: [
            { card: "BT18-090", as: "zoe" },
            { card: "BT1-010", as: "rookie" },
          ],
          hand: [
            { card: "BT18-049", as: "zephyrmon" },
            { card: "BT1-018", as: "champion" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    locked.state.memory = 10;
    await locked.ready();
    expect(digivolveRookie(locked)).toMatchObject({ ok: false });
    expect(locked.perm("rookie").topCard.cardId).toBe("BT1-010");
    expect(digivolveFromZoe(locked)).toEqual({ ok: true });
    await settle(() => locked.perm("zoe").topCard.cardId === "BT18-049");
    expect(locked.state.memory).toBe(7);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2980)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-049", as: "zephyrmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromZoe(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("zoe").topCard.cardId).toBe("BT18-049");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2981)", async () => {
    async function digivolvedFromZoe(enteredThisTurn: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-090", as: "zoe", enteredThisTurn }],
            hand: [{ card: "BT18-049", as: "zephyrmon" }],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(digivolveFromZoe(s)).toEqual({ ok: true });
      await settle(() => s.perm("zoe").topCard.cardId === "BT18-049");
      await settle();
      return s;
    }
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zoe").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = await digivolvedFromZoe(true);
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("zoe").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = await digivolvedFromZoe(false);
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("zoe").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6621)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-049", as: "zephyrmon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const zoeCard = s.perm("zoe").topCard.instanceId;
    expect(digivolveFromZoe(s)).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard.cardId === "BT18-049");
    expect(s.perm("zoe").stack.map(({ instanceId }) => instanceId)).toEqual([zoeCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("zoe").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([zoeCard, s.inst("zephyrmon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6622)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-049", as: "zephyrmon" }],
          security: [{ card: "BT18-090", as: "securityZoe" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromZoe(s)).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard.cardId === "BT18-049");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("zoe"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("zoe").stack.map(({ cardId }) => cardId)).toEqual(["BT18-090"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityZoe"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityZoe").topCard.cardId).toBe("BT18-090");
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6623)", async () => {
    async function battleDeleteWith(source: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-049", as: "zephyrmon", under: [source] }],
            hand: [{ card: "BT12-088", as: "takuya" }],
            deck: [...FILLER],
          },
          1: { battleArea: [{ card: "BT1-030", as: "gomamon", suspended: true }], security: [], deck: [...FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("zephyrmon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("gomamon").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await settle();
      return s;
    }

    const overZoe = await battleDeleteWith("BT18-090");
    expect(overZoe.state.players[0]!.hand).toHaveLength(0);
    expect(overZoe.perm("takuya").topCard.cardId).toBe("BT12-088");
    expect(overZoe.state.memory).toBe(5);

    const overDigimon = await battleDeleteWith("BT1-009");
    expect(overDigimon.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-088"]);
    expect(overDigimon.state.players[0]!.battleArea).toHaveLength(1);
  });
});
