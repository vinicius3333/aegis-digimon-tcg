import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-048.js";
import "../index.js";

describe("BT18-048 Kazemon", () => {
  it("suspends the exact opposing Digimon when digivolving from Zoe Orimoto", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] },
      { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", reduceCost: 1 }] },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanYourEffect" }],
      },
    ]);
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-045", as: "base" }], hand: [{ card: "BT18-048", as: "kazemon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kazemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-048");

    expect(s.perm("base").topCard?.cardId).toBe("BT18-048");
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("uses the zero-cost Zephyrmon evolution route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-049", as: "zephyrmon" }], hand: [{ card: "BT18-048", as: "kazemon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "target" }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("zephyrmon").permanentId,
        instanceId: s.inst("kazemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zephyrmon").topCard?.cardId === "BT18-048");

    expect(s.state.memory).toBe(5);
    expect(s.perm("zephyrmon").stack.at(-1)?.cardId).toBe("BT18-049");
    assertNoLoudGap(s);
  });

  it("digivolves a friendly Digimon into a green Hybrid for 1 less on its first attack", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-045", as: "base" },
            { card: "BT18-045", as: "secondBase" },
          ],
          hand: [
            { card: "BT18-047", as: "hybrid" },
            { card: "BT18-047", as: "secondHybrid" },
            { card: "BT1-030", as: "nonHybrid" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("hybrid").instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kazemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-047");

    expect(s.state.memory).toBe(4);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT18-045");

    await advance(s.engine).verb.unsuspend([s.perm("kazemon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kazemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("secondBase").topCard?.cardId).toBe("BT18-045");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondHybrid").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("nonHybrid").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays an inherited-effect Tamer from its host stack when an opponent effect removes it", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090", "BT18-048"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.perm("host").stack.find(({ cardId }) => cardId === "BT18-090")!.instanceId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not activate the inherited replacement for its owner's effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090", "BT18-048"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-090");
    assertNoLoudGap(s);
  });
});

const ZOE = "BT18-090";
const FILLER = ["BT1-009", "BT1-010", "BT1-009", "BT1-010"];

async function digivolveZoeIntoKazemon(s: EngineSetup, zoeAlias = "zoe", kazemonAlias = "kazemon"): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(zoeAlias).permanentId,
      instanceId: s.inst(kazemonAlias).instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm(zoeAlias).topCard?.cardId === "BT18-048");
  await settle();
  expect(s.perm(zoeAlias).topCard?.cardId).toBe("BT18-048");
}

describe("BT18-048 Kazemon — KB Q&A rulings", () => {
  it("digivolves Zoe as-is: no Digimon-digivolve watchers fire and a Digimon can't-digivolve lock does not stop it (Q2976)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: ZOE, as: "zoe" },
            { card: "BT18-045", as: "pomumon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-048", as: "secondKazemon" },
          ],
          deck: [...FILLER],
          security: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    watched.state.memory = 10;
    await watched.ready();

    await digivolveZoeIntoKazemon(watched);
    expect(watched.perm("opponentTarget").isSuspended).toBe(true);
    expect(watched.perm("calumon").isSuspended).toBe(false);

    expect(
      watched.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: watched.perm("pomumon").permanentId,
        instanceId: watched.inst("secondKazemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => watched.perm("calumon").isSuspended);
    expect(watched.perm("calumon").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: [
            { card: ZOE, as: "zoe" },
            { card: "BT18-045", as: "pomumon" },
          ],
          hand: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-048", as: "secondKazemon" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    locked.state.memory = 10;
    await locked.ready();

    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("pomumon").permanentId,
        instanceId: locked.inst("secondKazemon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    await digivolveZoeIntoKazemon(locked);
  });

  it("lets the player order the deleted host's [On Deletion] and the played Tamer's [On Play], which trigger together (Q2977)", async () => {
    const resolveOrderWhenChoosingFirst = async (firstCardId: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST16-07", as: "host", under: [{ card: "BT7-091", as: "koichi" }, "BT18-048"] }],
            hand: ["BT1-009"],
            deck: [...FILLER],
          },
          1: { battleArea: ["BT1-010"], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      s.state.turnSeat = 1;
      s.state.memory = 8;
      await s.ready();

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
        s.inst("koichi").instanceId,
      ]);
      const pending = s.state.pendingDecision;
      expect(pending?.kind).toBe("orderTriggers");
      const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
      const offeredCardIds = request?.options?.triggerCardIds ?? [];
      expect(offeredCardIds).toEqual(expect.arrayContaining(["ST16-07", "BT7-091"]));

      const firstKey = request!.options!.triggerKeys![offeredCardIds.indexOf(firstCardId)]!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending!.decisionId,
          response: { kind: "orderTriggers", order: [firstKey] },
        }),
      ).toEqual({ ok: true });
      await settle();

      return s.events.flatMap((event) =>
        event.kind === "effectResolved" && event.seat === 0 ? [`${event.sourceCardId}:${event.timing}`] : [],
      );
    };

    const meramonOnDeletion = "ST16-07:OnDestroyedAnyone";
    const koichiOnPlay = "BT7-091:OnPlay";
    expect(await resolveOrderWhenChoosingFirst("ST16-07")).toEqual([meramonOnDeletion, koichiOnPlay]);
    expect(await resolveOrderWhenChoosingFirst("BT7-091")).toEqual([koichiOnPlay, meramonOnDeletion]);
  });

  it("performs the digivolution bonus draw when Zoe digivolves into it (Q2978)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ZOE, as: "zoe" }],
          hand: [{ card: "BT18-048", as: "kazemon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-030" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    await digivolveZoeIntoKazemon(s);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("cannot attack after digivolving from a Zoe played this turn, but can from an established Zoe (Q6617)", async () => {
    const attackAfterDigivolving = async (enteredThisTurn: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: ZOE, as: "zoe", enteredThisTurn }],
            hand: [{ card: "BT18-048", as: "kazemon" }],
            deck: [...FILLER],
          },
          1: { battleArea: [{ card: "BT1-030" }], security: ["BT1-011"] },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      await digivolveZoeIntoKazemon(s);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zoe").permanentId,
        target: { kind: "player" },
      }).ok;
    };

    expect(await attackAfterDigivolving(true)).toBe(false);
    expect(await attackAfterDigivolving(false)).toBe(true);
  });

  it("keeps Zoe as a digivolution card that is trashed when Kazemon leaves play (Q6618)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ZOE, as: "zoe" }],
          hand: [{ card: "BT18-048", as: "kazemon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 24000, suspended: true }], security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    await digivolveZoeIntoKazemon(s);

    const kazemon = s.perm("zoe");
    expect(kazemon.stack.map((card) => card.cardId)).toEqual([ZOE]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kazemon.permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT18-048", ZOE]));
  });

  it("does not gain the [Security] effect of a Zoe in its digivolution cards (Q6619)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-048", as: "kazemon", under: [{ card: ZOE, as: "zoeUnder" }] }],
        security: [{ card: ZOE, as: "zoeInSecurity" }],
      },
    });
    await s.ready();
    const driver = advance(s.engine);
    const tamersInPlay = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === ZOE).length;

    await driver.fire(EffectTiming.SecuritySkill, s.perm("kazemon"));
    await settle();
    expect(tamersInPlay()).toBe(0);
    expect(s.perm("kazemon").stack.some((card) => card.instanceId === s.inst("zoeUnder").instanceId)).toBe(true);

    await driver.fireForInstance(EffectTiming.SecuritySkill, s.inst("zoeInSecurity"));
    await settle(() => tamersInPlay() === 1);
    expect(tamersInPlay()).toBe(1);
  });

  it("gains the inherited effect of a Zoe in its digivolution cards and plays a Tamer after a battle deletion (Q6620)", async () => {
    const tamerPlayedAfterBattleDeletion = async (zoeUnderKazemon: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-048", as: "kazemon", under: zoeUnderKazemon ? [ZOE] : ["BT18-045"] }],
            hand: [{ card: ZOE, as: "zoeInHand" }],
            deck: [...FILLER],
          },
          1: { battleArea: [{ card: "BT1-010", as: "defender", suspended: true }], security: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("kazemon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await settle();

      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(3);
      return s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("zoeInHand").instanceId,
      );
    };

    expect(await tamerPlayedAfterBattleDeletion(true)).toBe(true);
    expect(await tamerPlayedAfterBattleDeletion(false)).toBe(false);
  });
});
