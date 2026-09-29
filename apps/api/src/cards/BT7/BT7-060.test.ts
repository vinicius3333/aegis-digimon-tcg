import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import "./BT7-060.js";
import "../AD1/AD1-023.js";
import "../BT13/BT13-007.js";
import "../BT2/BT2-089.js";
import "../BT5/BT5-091.js";

describe("BT7-060 Grumblemon", () => {
  it("digivolves from hand onto a black Tamer for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-060", as: "grumble" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("grumble").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-060" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-060");
  });
});

describe("BT7-060 Grumblemon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  function tamerBoard(tamerCard: string, seat0: SeatSpec = {}, seat1: SeatSpec = {}, enteredThisTurn = false) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-060", as: "grumble" }],
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

  function digivolveOntoTamer(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("grumble").instanceId,
    });
  }

  async function digivolvedOntoTamer(s: EngineSetup) {
    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-060");
    await settle();
    return s.perm("tamer");
  }

  function attackOpponentDigimon(s: EngineSetup, defenderAlias: string) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("tamer").permanentId,
      target: { kind: "permanent", permanentId: s.perm(defenderAlias).permanentId },
    });
  }

  const strongerSuspendedDefender: SeatSpec = {
    battleArea: [{ card: "BT1-020", as: "defender", dp: 7000, suspended: true }],
  };

  // Engine gap: a Tamer base digivolves as a Tamer (tamerDigivolved), so the "as if the Tamer is a
  // Digimon" status of this card's digivolution is ignored by Digimon-only watchers and restrictions.
  it.fails("treats the Tamer as a digivolving Digimon: digivolve triggers fire and can't-digivolve blocks it (Q1607)", async () => {
    const levelThreeBase = { battleArea: [{ card: "BT11-060", as: "levelThree" }] };
    const digivolveOntoLevelThree = (s: EngineSetup) =>
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelThree").permanentId,
        instanceId: s.inst("grumble").instanceId,
      });

    const digimonControl = tamerBoard("BT2-089", {
      battleArea: [...levelThreeBase.battleArea, { card: "BT5-091", as: "takumi" }],
    });
    expect(digivolveOntoLevelThree(digimonControl)).toEqual({ ok: true });
    await settle(() => digimonControl.perm("takumi").isSuspended);

    const withTrigger = tamerBoard("BT2-089", { battleArea: [{ card: "BT5-091", as: "takumi" }] });
    const handBefore = withTrigger.state.players[0]!.hand.length;
    await digivolvedOntoTamer(withTrigger);
    await settle(() => withTrigger.perm("takumi").isSuspended);
    // Hand: -1 Grumblemon, +1 digivolution bonus draw, +1 Takumi Aiba draw.
    expect(withTrigger.state.players[0]!.hand.length).toBe(handBefore + 1);

    const restrictedControl = tamerBoard("BT2-089", { ...levelThreeBase, breeding: "BT13-007" });
    await restrictedControl.ready();
    expect(digivolveOntoLevelThree(restrictedControl)).toMatchObject({ ok: false });

    const restricted = tamerBoard("BT2-089", { breeding: "BT13-007" });
    await restricted.ready();
    expect(digivolveOntoTamer(restricted)).toMatchObject({ ok: false });
    await settle();
    expect(restricted.perm("tamer").topCard?.cardId).toBe("BT2-089");
    expect(restricted.state.memory).toBe(5);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q1608)", async () => {
    const s = tamerBoard("BT2-089");
    const bonusDrawId = s.inst("bonusDraw").instanceId;
    await digivolvedOntoTamer(s);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([bonusDrawId]);
    expect(s.state.memory).toBe(3);
  });

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q1609)", async () => {
    const fresh = tamerBoard("BT2-089", {}, strongerSuspendedDefender, true);
    await digivolvedOntoTamer(fresh);
    expect(attackOpponentDigimon(fresh, "defender")).toMatchObject({ ok: false });
    expect(fresh.perm("tamer").isSuspended).toBe(false);

    const established = tamerBoard("BT2-089", {}, strongerSuspendedDefender);
    await digivolvedOntoTamer(established);
    expect(attackOpponentDigimon(established, "defender")).toEqual({ ok: true });
  });

  it("trashes the Tamer card as a digivolution card when the Digimon leaves the field (Q1610)", async () => {
    const s = tamerBoard("BT2-089", {}, strongerSuspendedDefender);
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;
    const grumblemon = await digivolvedOntoTamer(s);
    const permanentId = grumblemon.permanentId;
    expect(grumblemon.stack.map(({ instanceId }) => instanceId)).toEqual([tamerInstanceId]);

    expect(attackOpponentDigimon(s, "defender")).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
    const trash = s.state.players[0]!.trash.map(({ cardId }) => cardId);
    expect(trash).toContain("BT2-089");
    expect(trash).toContain("BT7-060");
  });

  it("does not gain the Security effect from the lower text of a Tamer in its digivolution cards (Q1611)", async () => {
    expect(getCardDefinition("BT2-089")?.securityEffectText).toContain("[Security]");
    const s = tamerBoard("BT2-089");
    const grumblemon = await digivolvedOntoTamer(s);
    expect(grumblemon.stack.map(({ cardId }) => cardId)).toEqual(["BT2-089"]);
    expect(observe(s.engine).canUseInheritedEffect(grumblemon, "BT2-089")).toBe(false);

    const withInherited = tamerBoard("AD1-023");
    const control = await digivolvedOntoTamer(withInherited);
    expect(observe(withInherited.engine).canUseInheritedEffect(control, "AD1-023")).toBe(true);
  });

  it("gains the inherited effect from the lower text of a Tamer in its digivolution cards (Q1612)", async () => {
    const control = tamerBoard("BT2-089", {}, strongerSuspendedDefender);
    const controlId = (await digivolvedOntoTamer(control)).permanentId;
    expect(attackOpponentDigimon(control, "defender")).toEqual({ ok: true });
    await settle(() => !control.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === controlId));

    const s = tamerBoard("AD1-023", {}, strongerSuspendedDefender);
    const grumblemon = await digivolvedOntoTamer(s);
    const permanentId = grumblemon.permanentId;
    const securityBefore = s.state.players[0]!.security.length;

    expect(attackOpponentDigimon(s, "defender")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore - 1);
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT7-060");
  });

  it("can't back out of a declared digivolution onto a Tamer, and can't declare it without a black Tamer to digivolve (Q4647)", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-089", as: "tamer" }],
          hand: [{ card: "BT7-060", as: "grumble" }],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 5;
    expect(digivolveOntoTamer(declined)).toEqual({ ok: true });
    await settle(() => declined.perm("tamer").topCard?.cardId === "BT7-060");
    expect(declined.perm("tamer").topCard?.cardId).toBe("BT7-060");
    expect(declined.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(declined.state.memory).toBe(3);

    const nonBlackTamer = tamerBoard("BT1-085");
    expect(digivolveOntoTamer(nonBlackTamer)).toMatchObject({ ok: false });
    await settle();
    expect(nonBlackTamer.perm("tamer").topCard?.cardId).toBe("BT1-085");
    expect(nonBlackTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-060"]);
    expect(nonBlackTamer.state.memory).toBe(5);
  });
});
