import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-024.js";
import "../BT7/BT7-086.js";
import "./BT12-090.js";
import "../BT13/BT13-007.js";
import "../BT13/BT13-100.js";

describe("BT12-024 Lanamon", () => {
  it("digivolves from Calmaramon for 0 with the evolution draw and source transition", async () => {
    expect(digivolutionRequirementsFor("BT12-024")).toContainEqual({
      names: ["Calmaramon"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-025", as: "calmaramon" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT12-024");
    expect(s.state.memory).toBe(0);
    expect(s.perm("calmaramon").stack.map(({ cardId }) => cardId)).toContain("BT12-025");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("digivolves from a blue Tamer for 0 and preserves it as an evolution card", async () => {
    expect(digivolutionRequirementsFor("BT12-024")).toContainEqual({
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("davis").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("davis").topCard.cardId === "BT12-024");
    expect(s.perm("davis").stack.map(({ cardId }) => cardId)).toContain("BT12-090");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer route from a non-blue Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-088", as: "takuya" }], hand: [{ card: "BT12-024", as: "lanamon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may place a blue level 3 from hand under a chosen blue Digimon and gain Jamming for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-024", as: "lanamon" },
            { card: "BT12-025", as: "recipient", under: ["BT1-009"] },
          ],
          hand: [{ card: "BT12-021", as: "material" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lanamon"));
    await settle(() => s.state.players[0]!.hand.length === 0);
    const hosts = s.state.players[0]!.battleArea.filter((permanent) =>
      permanent.stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId),
    );
    expect(hosts).toHaveLength(1);
    expect(hosts[0]!.stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("lanamon"), "Jamming")).toBe(true);
  });

  it("can decline the placement and excludes a non-blue level 3 card", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT12-024", as: "lanamon" }], hand: [{ card: "BT12-021", as: "material" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("lanamon"));
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("material").instanceId,
    );
    expect(observe(declined.engine).hasKeyword(declined.perm("lanamon"), "Jamming")).toBe(false);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT12-024", as: "lanamon" }], hand: [{ card: "BT12-048", as: "material" }] },
    });
    await advance(wrongColor.engine).fire(EffectTiming.WhenDigivolving, wrongColor.perm("lanamon"));
    expect(wrongColor.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      wrongColor.inst("material").instanceId,
    );
    expect(observe(wrongColor.engine).hasKeyword(wrongColor.perm("lanamon"), "Jamming")).toBe(false);
  });
});

describe("BT12-024 Lanamon — KB Q&A rulings", () => {
  function digivolveOntoTamer(s: EngineSetup, tamerAlias: string, lanamonAlias: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst(lanamonAlias).instanceId,
      useAlternateCost: true,
    });
  }

  function trashIds(s: EngineSetup, seat: 0 | 1): string[] {
    return s.state.players[seat]!.trash.map(({ instanceId }) => instanceId);
  }

  it.fails("treats the Tamer as a digivolving Digimon for digivolve watchers and can't-digivolve locks (Q2151)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-090", as: "davis" },
            { card: "BT13-100", as: "yoshino" },
          ],
          hand: [{ card: "BT12-024", as: "lanamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["placing"] },
    );
    await watched.ready();
    expect(digivolveOntoTamer(watched, "davis", "lanamon")).toEqual({ ok: true });
    await settle(() => watched.perm("davis").topCard.cardId === "BT12-024");
    await settle();
    expect(watched.perm("davis").topCard.cardId).toBe("BT12-024");
    expect(watched.perm("yoshino").isSuspended).toBe(true);
    expect(watched.state.memory).toBe(1);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "kingDrasil" },
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009"],
      },
    });
    await locked.ready();
    expect(digivolveOntoTamer(locked, "davis", "lanamon")).toMatchObject({ ok: false });
    expect(locked.perm("davis").topCard.cardId).toBe("BT12-090");
    expect(locked.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      locked.inst("lanamon").instanceId,
    );
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2152)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    await s.ready();
    expect(digivolveOntoTamer(s, "davis", "lanamon")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.perm("davis").topCard.cardId).toBe("BT12-024");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q2153)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "establishedDavis" }],
        hand: [
          { card: "BT12-090", as: "freshDavis" },
          { card: "BT12-024", as: "freshLanamon" },
          { card: "BT12-024", as: "establishedLanamon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: 3,
      },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshDavis").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(digivolveOntoTamer(s, "freshDavis", "freshLanamon")).toEqual({ ok: true });
    await settle(() => s.perm("freshDavis").topCard.cardId === "BT12-024");
    expect(digivolveOntoTamer(s, "establishedDavis", "establishedLanamon")).toEqual({ ok: true });
    await settle(() => s.perm("establishedDavis").topCard.cardId === "BT12-024");
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

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q2154)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-020", as: "defender", suspended: true }] },
    });
    await s.ready();
    const davisInstanceId = s.inst("davis").instanceId;
    const lanamonInstanceId = s.inst("lanamon").instanceId;

    expect(digivolveOntoTamer(s, "davis", "lanamon")).toEqual({ ok: true });
    await settle(() => s.perm("davis").topCard.cardId === "BT12-024");
    expect(s.perm("davis").stack.map(({ instanceId }) => instanceId)).toEqual([davisInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("davis").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(trashIds(s, 0)).toEqual(expect.arrayContaining([davisInstanceId, lanamonInstanceId]));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q2155)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT12-024", as: "lanamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["placing"] },
    );
    await s.ready();
    const tommyInstanceId = s.inst("tommy").instanceId;
    expect(digivolveOntoTamer(s, "tommy", "lanamon")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT12-024");
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

  it("gains the inherited effect of a Tamer in its digivolution cards (Q2156)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT12-024", as: "lanamon" }],
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
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["placing"] },
    );
    await s.ready();
    expect(digivolveOntoTamer(s, "tommy", "lanamon")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT12-024");
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

  it("cannot decline a declared Tamer digivolution and cannot declare it without a legal base (Q4653)", async () => {
    const noLegalBase = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-088", as: "redTamer" },
          { card: "BT1-009", as: "redLevel3" },
        ],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-010"],
      },
    });
    await noLegalBase.ready();
    for (const baseAlias of ["redTamer", "redLevel3"]) {
      for (const useAlternateCost of [true, false]) {
        expect(
          noLegalBase.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: noLegalBase.perm(baseAlias).permanentId,
            instanceId: noLegalBase.inst("lanamon").instanceId,
            useAlternateCost,
          }),
        ).toMatchObject({ ok: false });
      }
    }
    expect(noLegalBase.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      noLegalBase.inst("lanamon").instanceId,
    ]);

    const declared = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-090", as: "davis" }],
          hand: [{ card: "BT12-024", as: "lanamon" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await declared.ready();
    expect(digivolveOntoTamer(declared, "davis", "lanamon")).toEqual({ ok: true });
    await settle(() => declared.perm("davis").topCard.cardId === "BT12-024");
    expect(declared.perm("davis").topCard.instanceId).toBe(declared.inst("lanamon").instanceId);
    expect(declared.perm("davis").stack.map(({ instanceId }) => instanceId)).toEqual([
      declared.inst("davis").instanceId,
    ]);
    expect(declared.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      declared.inst("lanamon").instanceId,
    );
    expect(declared.decisions).toEqual([]);
  });
});
