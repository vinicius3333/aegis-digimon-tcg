import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-067.js";
import "../BT1/BT1-018.js";
import "../BT5/BT5-091.js";
import "../BT9/BT9-090.js";
import "../BT13/BT13-007.js";
import "./BT18-013.js";
import "./BT18-067.js";
import "./BT18-091.js";
import "./BT18-094.js";

describe("BT18-067 MetalKabuterimon", () => {
  it("de-digivolves one opponent card on play and has Blocker", async () => {
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      { trigger: "OnPlay", actions: [{ kind: "DeDigivolve", amount: 1 }] },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-067", as: "metalKabuterimon" }] },
        1: { battleArea: [{ card: "BT18-064", as: "opponentTarget", under: [{ card: "BT1-009", as: "remaining" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const removed = s.perm("opponentTarget").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalKabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-067"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removed));
    await s.ready();

    expect(s.perm("opponentTarget").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("opponentTarget").stack.some((card) => card.instanceId === removed)).toBe(false);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === removed)).toHaveLength(1);
    const metal = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-067")!;
    expect(observe(s.engine).hasKeyword(metal, "Blocker")).toBe(true);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it.each([
    ["black level 3", "BT18-059", false, 4],
    ["yellow level 3", "BT1-045", false, 4],
    ["J.P. Shibayama", "BT18-091", true, 3],
    ["Beetlemon", "BT18-063", true, 1],
  ])("digivolves from %s for the printed cost", async (_label, baseCard, useAlternateCost, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT18-064", as: "target", under: ["BT1-009"] }] },
    });
    s.state.memory = 8;
    const removed = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalKabuterimon").instanceId,
        useAlternateCost,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === removed));

    expect(s.state.memory).toBe(8 - cost);
    expect(s.perm("base").topCard?.cardId).toBe("BT18-067");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("de-digivolves an opposing stack without touching a friendly stack or naked peer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
          battleArea: [{ card: "BT18-064", as: "friendly", under: ["BT1-009"] }],
        },
        1: {
          battleArea: [
            { card: "BT18-064", as: "eligible", under: [{ card: "BT1-009", as: "remaining" }] },
            { card: "BT1-009", as: "naked" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const friendlyTop = s.perm("friendly").topCard!.instanceId;
    const eligibleTop = s.perm("eligible").topCard!.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalKabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === eligibleTop));
    expect(s.perm("friendly").topCard?.instanceId).toBe(friendlyTop);
    expect(s.perm("naked").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("eligible").topCard?.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("grants inherited Blocker only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT18-067"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT18-067 MetalKabuterimon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveFromShibayama(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("shibayama").permanentId,
      instanceId: s.inst("metalKabuterimon").instanceId,
      useAlternateCost: true,
    });
  }

  function digivolveRookie(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("rookie").permanentId,
      instanceId: s.inst("champion").instanceId,
    });
  }

  async function digivolvedFromShibayama(options: { enteredThisTurn?: boolean } = {}) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "shibayama", enteredThisTurn: options.enteredThisTurn ?? false }],
          hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
          deck: [...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(digivolveFromShibayama(s)).toEqual({ ok: true });
    await settle(() => s.perm("shibayama").topCard.cardId === "BT18-067");
    await s.ready();
    return s;
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q3002)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-091", as: "shibayama" },
              { card: "BT1-010", as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [
              { card: "BT18-067", as: "metalKabuterimon" },
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
    expect(digivolveFromShibayama(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("shibayama").topCard.cardId === "BT18-067");
    await settle();
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-018"]);

    async function boardWithMakiHimekawa() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-091", as: "shibayama" },
              { card: "BT18-059", as: "blackRookie" },
              { card: "BT9-090", as: "maki" },
            ],
            hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      return s;
    }

    const wouldDigivolveControl = await boardWithMakiHimekawa();
    expect(
      wouldDigivolveControl.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wouldDigivolveControl.perm("blackRookie").permanentId,
        instanceId: wouldDigivolveControl.inst("metalKabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => wouldDigivolveControl.perm("blackRookie").topCard.cardId === "BT18-067");
    await settle();
    expect(wouldDigivolveControl.perm("maki").isSuspended).toBe(true);
    expect(wouldDigivolveControl.state.memory).toBe(7);

    const wouldDigivolveFromTamer = await boardWithMakiHimekawa();
    expect(digivolveFromShibayama(wouldDigivolveFromTamer)).toEqual({ ok: true });
    await settle(() => wouldDigivolveFromTamer.perm("shibayama").topCard.cardId === "BT18-067");
    await settle();
    expect(wouldDigivolveFromTamer.perm("maki").isSuspended).toBe(false);
    expect(wouldDigivolveFromTamer.state.memory).toBe(7);

    const locked = setupEngine(
      {
        0: {
          breeding: "BT13-007",
          battleArea: [
            { card: "BT18-091", as: "shibayama" },
            { card: "BT1-010", as: "rookie" },
          ],
          hand: [
            { card: "BT18-067", as: "metalKabuterimon" },
            { card: "BT1-018", as: "champion" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    locked.state.memory = 10;
    await locked.ready();
    expect(digivolveRookie(locked)).toMatchObject({ ok: false });
    expect(locked.perm("rookie").topCard.cardId).toBe("BT1-010");
    expect(digivolveFromShibayama(locked)).toEqual({ ok: true });
    await settle(() => locked.perm("shibayama").topCard.cardId === "BT18-067");
    expect(locked.state.memory).toBe(7);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q3003)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "shibayama" }],
          hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(digivolveFromShibayama(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("shibayama").topCard.cardId).toBe("BT18-067");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q3004)", async () => {
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shibayama").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = await digivolvedFromShibayama({ enteredThisTurn: true });
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("shibayama").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = await digivolvedFromShibayama();
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("shibayama").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6643)", async () => {
    const s = await digivolvedFromShibayama();
    const shibayamaCard = s.perm("shibayama").stack[0]!.instanceId;
    expect(s.perm("shibayama").stack.map(({ cardId }) => cardId)).toEqual(["BT18-091"]);

    await advance(s.engine).verb.deletePermanent([s.perm("shibayama").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([shibayamaCard, s.inst("metalKabuterimon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6644)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "shibayama" }],
          hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
          security: [{ card: "BT18-091", as: "securityShibayama" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromShibayama(s)).toEqual({ ok: true });
    await settle(() => s.perm("shibayama").topCard.cardId === "BT18-067");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("shibayama"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("shibayama").stack.map(({ cardId }) => cardId)).toEqual(["BT18-091"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityShibayama"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityShibayama").topCard.cardId).toBe("BT18-091");
  });

  it("gains the inherited effects of a Tamer in its digivolution cards (Q6645)", async () => {
    async function raidAttackWithMetalKabuterimonOver(baseCard: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-067", as: "metalKabuterimon", under: [baseCard] },
              { card: "BT18-013", as: "raid" },
            ],
            hand: [{ card: "BT18-094", as: "tamer" }],
            deck: [...FILLER],
          },
          1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 1000 }], security: [] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("raid").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await settle();
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      return s;
    }
    const tamerInPlay = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("tamer").instanceId);

    const withShibayama = await raidAttackWithMetalKabuterimonOver("BT18-091");
    expect(tamerInPlay(withShibayama)).toBe(true);

    const withoutShibayama = await raidAttackWithMetalKabuterimonOver("BT1-013");
    expect(tamerInPlay(withoutShibayama)).toBe(false);
    expect(withoutShibayama.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      withoutShibayama.inst("tamer").instanceId,
    );
  });
});
