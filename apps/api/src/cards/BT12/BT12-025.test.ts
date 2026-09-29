import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-025.js";
import "./BT12-090.js";
import "../BT7/BT7-086.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-085.js";

describe("BT12-025 Calmaramon", () => {
  it("digivolves from Lanamon for 1", async () => {
    expect(digivolutionRequirementsFor("BT12-025")).toContainEqual({
      names: ["Lanamon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-024", as: "lanamon" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").topCard.cardId === "BT12-025");
    expect(s.state.memory).toBe(9);
    expect(s.perm("lanamon").stack.map(({ cardId }) => cardId)).toContain("BT12-024");
  });

  it("digivolves from a blue Tamer for 0 and rejects a non-blue Tamer", async () => {
    expect(digivolutionRequirementsFor("BT12-025")).toContainEqual({
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    });
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("davis").permanentId,
        instanceId: valid.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("davis").topCard.cardId === "BT12-025");
    expect(valid.perm("davis").stack.map(({ cardId }) => cardId)).toContain("BT12-090");
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-088", as: "takuya" }], hand: [{ card: "BT12-025", as: "calmaramon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("takuya").permanentId,
        instanceId: invalid.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may play a blue level 3 from one of its blue Digimon's evolution cards for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-025", as: "calmaramon" },
            { card: "BT12-024", as: "source", under: ["BT12-021"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const material = s.perm("source").stack[0]!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("calmaramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-021"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === material)).toBe(true);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("can decline and excludes level/color near-matches from evolution cards", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-025", as: "calmaramon" },
            { card: "BT12-024", as: "source", under: ["BT12-021"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("calmaramon"));
    expect(declined.perm("source").stack).toHaveLength(1);

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-025", as: "calmaramon" },
          { card: "BT12-024", as: "source", under: ["BT12-048", "BT12-024"] },
        ],
      },
    });
    await advance(invalid.engine).fire(EffectTiming.OnUseAttack, invalid.perm("calmaramon"));
    expect(invalid.perm("source").stack).toHaveLength(2);
    expect(invalid.state.players[0]!.battleArea).toHaveLength(2);
  });
});

describe("BT12-025 Calmaramon — KB Q&A rulings", () => {
  function digivolveOntoTamer(s: EngineSetup, tamerAlias: string, calmaramonAlias: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst(calmaramonAlias).instanceId,
      useAlternateCost: true,
    });
  }

  function handIds(s: EngineSetup): string[] {
    return s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  }

  it("treats the Tamer as a digivolving Digimon for digivolve watchers and can't-digivolve locks (Q2158)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-090", as: "davis" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT12-025", as: "calmaramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    watched.state.memory = 5;
    await watched.ready();
    expect(watched.perm("watcher").isSuspended).toBe(false);
    expect(digivolveOntoTamer(watched, "davis", "calmaramon")).toEqual({ ok: true });
    await settle(() => watched.perm("davis").topCard.cardId === "BT12-025");
    await settle();
    expect(watched.perm("watcher").isSuspended).toBe(true);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "kingDrasil" },
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    locked.state.memory = 5;
    await locked.ready();
    expect(digivolveOntoTamer(locked, "davis", "calmaramon")).toMatchObject({ ok: false });
    expect(locked.perm("davis").topCard.cardId).toBe("BT12-090");
    expect(handIds(locked)).toContain(locked.inst("calmaramon").instanceId);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2159)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(digivolveOntoTamer(s, "davis", "calmaramon")).toEqual({ ok: true });
    await settle(() => handIds(s).includes(s.inst("drawn").instanceId));
    expect(s.perm("davis").topCard.cardId).toBe("BT12-025");
    expect(handIds(s)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q2160)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "establishedDavis" }],
        hand: [
          { card: "BT12-090", as: "freshDavis" },
          { card: "BT12-025", as: "freshCalmaramon" },
          { card: "BT12-025", as: "establishedCalmaramon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: 3,
      },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshDavis").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(digivolveOntoTamer(s, "freshDavis", "freshCalmaramon")).toEqual({ ok: true });
    await settle(() => s.perm("freshDavis").topCard.cardId === "BT12-025");
    expect(digivolveOntoTamer(s, "establishedDavis", "establishedCalmaramon")).toEqual({ ok: true });
    await settle(() => s.perm("establishedDavis").topCard.cardId === "BT12-025");
    expect(s.perm("freshDavis").summoningSick).toBe(true);
    expect(s.perm("establishedDavis").summoningSick).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freshDavis").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("establishedDavis").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q2161)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-090", as: "davis" }],
          hand: [{ card: "BT12-025", as: "calmaramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-084", as: "defender", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const davisInstanceId = s.inst("davis").instanceId;
    const calmaramonInstanceId = s.inst("calmaramon").instanceId;

    expect(digivolveOntoTamer(s, "davis", "calmaramon")).toEqual({ ok: true });
    await settle(() => s.perm("davis").topCard.cardId === "BT12-025");
    expect(s.perm("davis").stack.map(({ instanceId }) => instanceId)).toEqual([davisInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("davis").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([davisInstanceId, calmaramonInstanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q2162)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT12-025", as: "calmaramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const tommyInstanceId = s.inst("tommy").instanceId;
    expect(digivolveOntoTamer(s, "tommy", "calmaramon")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT12-025");
    expect(observe(s.engine).canUseInheritedEffect(s.perm("tommy"), "BT7-086")).toBe(true);

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("tommy"));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tommy").stack.map(({ instanceId }) => instanceId)).toEqual([tommyInstanceId]);

    const revealed = setupEngine(
      { 0: { security: [{ card: "BT7-086", as: "securityTommy" }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await revealed.ready();
    await advance(revealed.engine).fireForInstance(EffectTiming.SecuritySkill, revealed.inst("securityTommy"));
    await settle(() => revealed.state.players[0]!.battleArea.length === 1);
    expect(revealed.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(
      revealed.inst("securityTommy").instanceId,
    );
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q2163)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT12-025", as: "calmaramon" }],
          deck: ["BT1-009", "BT1-010"],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "sourceless" },
            { card: "BT1-019", as: "sourced", under: ["BT1-010"] },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(digivolveOntoTamer(s, "tommy", "calmaramon")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT12-025");
    expect(observe(s.engine).isRestricted(s.perm("sourceless"), "attack")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("sourceless"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("sourceless"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sourceless"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sourced"), "attack")).toBe(false);
  });

  it("cannot decline a declared Tamer digivolution and cannot declare one without a blue Tamer to digivolve (Q4654)", async () => {
    const declared = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-090", as: "davis" }],
          hand: [{ card: "BT12-025", as: "calmaramon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    declared.state.memory = 5;
    await declared.ready();
    const davisInstanceId = declared.inst("davis").instanceId;
    const calmaramonInstanceId = declared.inst("calmaramon").instanceId;
    expect(digivolveOntoTamer(declared, "davis", "calmaramon")).toEqual({ ok: true });
    await settle(() => declared.perm("davis").topCard.instanceId === calmaramonInstanceId);
    expect(declared.perm("davis").stack.map(({ instanceId }) => instanceId)).toEqual([davisInstanceId]);
    expect(handIds(declared)).not.toContain(calmaramonInstanceId);
    expect(declared.state.memory).toBe(5);
    expect(
      declared.decisions.filter(
        ({ req }) =>
          req.sourceInstanceId === calmaramonInstanceId && (req.kind === "optional" || req.kind === "chooseOption"),
      ),
    ).toEqual([]);

    const noBlueTamer = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    noBlueTamer.state.memory = 5;
    await noBlueTamer.ready();
    expect(digivolveOntoTamer(noBlueTamer, "takuya", "calmaramon")).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
    expect(noBlueTamer.perm("takuya").topCard.cardId).toBe("BT12-088");
    expect(handIds(noBlueTamer)).toContain(noBlueTamer.inst("calmaramon").instanceId);
    expect(noBlueTamer.state.memory).toBe(5);
  });
});
