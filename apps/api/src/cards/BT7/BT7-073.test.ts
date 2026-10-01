import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-073.js";
import "./BT7-091.js";
import "../BT13/BT13-007.js";
import "../BT18/BT18-093.js";
import "../BT2/BT2-067.js";
import "../BT5/BT5-091.js";

describe("BT7-073 KaiserLeomon", () => {
  it("digivolves onto a purple Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-091", as: "base" }], hand: [{ card: "BT7-073", as: "evolving" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-073");
  });

  it("gains Retaliation when it has a Hybrid source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-071", as: "base" }], hand: [{ card: "BT7-073", as: "evolving" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });
});

describe("BT7-073 KaiserLeomon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
  const KOICHI_KIMURA = "BT7-091";
  const PLAIN_PURPLE_TAMER = "BT18-093";

  function tamerBoard(tamerCard: string, seat0: SeatSpec = {}, seat1: SeatSpec = {}, enteredThisTurn = false) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-073", as: "kaiser" }],
          deck: [{ card: "BT1-001", as: "bonusDraw" }, ...FILLER],
          security: ["BT1-009", "BT1-010"],
          ...seat0,
          battleArea: [{ card: tamerCard, as: "tamer", enteredThisTurn }, ...(seat0.battleArea ?? [])],
        },
        1: { deck: [...FILLER], security: ["BT1-009", "BT1-010"], ...seat1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    return s;
  }

  function digivolveOnto(s: EngineSetup, baseAlias = "tamer") {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst("kaiser").instanceId,
    });
  }

  async function digivolvedOntoTamer(s: EngineSetup) {
    await s.ready();
    expect(digivolveOnto(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-073");
    await settle();
    return s.perm("tamer");
  }

  function attack(s: EngineSetup, target: { kind: "player" } | { kind: "permanent"; permanentId: string }) {
    return s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("tamer").permanentId, target });
  }

  function attackDefender(s: EngineSetup) {
    return attack(s, { kind: "permanent", permanentId: s.perm("defender").permanentId });
  }

  const strongerSuspendedDefender: SeatSpec = {
    battleArea: [{ card: "BT1-020", as: "defender", dp: 7000, suspended: true }],
  };

  it("treats the Tamer as a digivolving Digimon: digivolve triggers fire and can't-digivolve blocks it (Q1634)", async () => {
    const purpleLevelThree = { card: "BT2-067", as: "levelThree" };

    const digimonControl = tamerBoard(KOICHI_KIMURA, {
      battleArea: [purpleLevelThree, { card: "BT5-091", as: "takumi" }],
    });
    await digimonControl.ready();
    expect(digivolveOnto(digimonControl, "levelThree")).toEqual({ ok: true });
    await settle(() => digimonControl.perm("takumi").isSuspended);

    const withTrigger = tamerBoard(KOICHI_KIMURA, { battleArea: [{ card: "BT5-091", as: "takumi" }] });
    const handBefore = withTrigger.state.players[0]!.hand.length;
    await digivolvedOntoTamer(withTrigger);
    await settle(() => withTrigger.perm("takumi").isSuspended);
    // Hand: -1 KaiserLeomon, +1 digivolution bonus draw, +1 Takumi Aiba draw.
    expect(withTrigger.state.players[0]!.hand.length).toBe(handBefore + 1);

    const restrictedControl = tamerBoard(KOICHI_KIMURA, { battleArea: [purpleLevelThree], breeding: "BT13-007" });
    await restrictedControl.ready();
    expect(digivolveOnto(restrictedControl, "levelThree")).toMatchObject({ ok: false });

    const restricted = tamerBoard(KOICHI_KIMURA, { breeding: "BT13-007" });
    await restricted.ready();
    expect(digivolveOnto(restricted)).toMatchObject({ ok: false });
    await settle();
    expect(restricted.perm("tamer").topCard?.cardId).toBe(KOICHI_KIMURA);
    expect(restricted.state.memory).toBe(5);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q1635)", async () => {
    const s = tamerBoard(KOICHI_KIMURA);
    const bonusDrawId = s.inst("bonusDraw").instanceId;
    await digivolvedOntoTamer(s);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([bonusDrawId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
    expect(s.state.memory).toBe(3);
  });

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q1636)", async () => {
    const fresh = tamerBoard(KOICHI_KIMURA, {}, {}, true);
    await digivolvedOntoTamer(fresh);
    expect(attack(fresh, { kind: "player" })).toMatchObject({ ok: false });
    expect(fresh.perm("tamer").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(2);

    const established = tamerBoard(KOICHI_KIMURA);
    await digivolvedOntoTamer(established);
    expect(attack(established, { kind: "player" })).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves the field (Q1637)", async () => {
    const s = tamerBoard(PLAIN_PURPLE_TAMER, {}, strongerSuspendedDefender);
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;
    const kaiserLeomon = await digivolvedOntoTamer(s);
    const permanentId = kaiserLeomon.permanentId;
    expect(kaiserLeomon.stack.map(({ instanceId }) => instanceId)).toEqual([tamerInstanceId]);

    expect(attackDefender(s)).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
    const trash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trash).toContain(tamerInstanceId);
    expect(trash).toContain(s.inst("kaiser").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the [Security] effect from the lower text of a Tamer in its digivolution cards (Q1638)", async () => {
    const s = tamerBoard(KOICHI_KIMURA, {}, { security: [KOICHI_KIMURA, "BT1-010"] });
    const kaiserLeomon = await digivolvedOntoTamer(s);
    const buriedKoichiId = kaiserLeomon.stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack collects the buried Tamer's effects too,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("tamer"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([buriedKoichiId]);

    expect(attack(s, { kind: "player" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === KOICHI_KIMURA));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([KOICHI_KIMURA]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([buriedKoichiId]);
  });

  it("gains the inherited effect from the lower text of a Tamer in its digivolution cards (Q1639)", async () => {
    const memoryAfterDeletionWith = async (tamerCard: string) => {
      const s = tamerBoard(tamerCard, {}, strongerSuspendedDefender);
      const permanentId = (await digivolvedOntoTamer(s)).permanentId;
      expect(s.state.memory).toBe(3);
      expect(attackDefender(s)).toEqual({ ok: true });
      await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
      await settle();
      return s.state.memory;
    };

    expect(await memoryAfterDeletionWith(PLAIN_PURPLE_TAMER)).toBe(3);
    expect(await memoryAfterDeletionWith(KOICHI_KIMURA)).toBe(4);
  });

  it("can't decline the Tamer digivolution once declared, and can't declare it without a purple Tamer to digivolve (Q4650)", async () => {
    const boardWith = (tamerCard: string) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT7-073", as: "kaiser" }],
            deck: [...FILLER],
            battleArea: [{ card: tamerCard, as: "tamer" }],
          },
          1: { deck: [...FILLER], security: ["BT1-009", "BT1-010"] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      return s;
    };

    const redTamerOnly = boardWith("BT1-085");
    await redTamerOnly.ready();
    expect(digivolveOnto(redTamerOnly)).toMatchObject({ ok: false });
    await settle();
    expect(redTamerOnly.perm("tamer").topCard?.cardId).toBe("BT1-085");
    expect(redTamerOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT7-073");
    expect(redTamerOnly.state.memory).toBe(5);

    const purpleTamer = boardWith(PLAIN_PURPLE_TAMER);
    await purpleTamer.ready();
    expect(digivolveOnto(purpleTamer)).toEqual({ ok: true });
    await settle(() => purpleTamer.perm("tamer").topCard?.cardId === "BT7-073");
    await settle();
    expect(purpleTamer.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(purpleTamer.perm("tamer").topCard?.cardId).toBe("BT7-073");
    expect(purpleTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT7-073");
    expect(purpleTamer.state.memory).toBe(3);
  });
});
