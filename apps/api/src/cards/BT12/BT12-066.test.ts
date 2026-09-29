import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import "./BT12-066.js";
import "../AD1/AD1-023.js";
import "../BT12/BT12-065.js";
import "../BT12/BT12-094.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-088.js";

describe("BT12-066 Mercurymon", () => {
  it("digivolves for 0 from Sephirothmon", async () => {
    expect(digivolutionRequirementsFor("BT12-066")).toContainEqual({
      names: ["Sephirothmon"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-065", as: "sephiroth" }],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephiroth").permanentId,
        instanceId: s.inst("mercury").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sephiroth").topCard.cardId === "BT12-066");
    expect(s.state.memory).toBe(0);
    expect(s.perm("sephiroth").stack.map(({ cardId }) => cardId)).toEqual(["BT12-065"]);
  });

  it("digivolves from a black Tamer for 2, draws, and resolves When Digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-094", as: "tamer" },
          { card: "BT1-009", as: "ally" },
        ],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "BT12-066" && req.kind === "chooseTargets"));
    const grant = s.decisions.find(({ req }) => req.sourceCardId === "BT12-066" && req.kind === "chooseTargets")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: grant.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects the Tamer evolution route from a non-black Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "blueTamer" }], hand: [{ card: "BT12-066", as: "mercury" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives one of your Digimon Blocker when played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "ally" }], hand: [{ card: "BT12-066", as: "mercury" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercury").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });

  it("gives one of your Digimon Blocker when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally" },
            { card: "BT12-066", as: "mercury" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mercury"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });
});

describe("BT12-066 Mercurymon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  async function digivolveOntoTamer(s: EngineSetup, tamerAlias: string): Promise<void> {
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(tamerAlias).permanentId,
        instanceId: s.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(tamerAlias).topCard.cardId === "BT12-066");
    await settle();
  }

  async function attackOversizedBlocker(s: EngineSetup, attackerAlias: string): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attackerAlias).permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  }

  // Known engine gap: the baseIsTamer alternate route is not seen as a digivolving Digimon.
  it.fails("treats the Tamer as a digivolving Digimon for digivolve watchers and can't-digivolve locks (Q2200)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-094", as: "yuu" },
            { card: "BT16-088", as: "cody" },
          ],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveOntoTamer(watched, "yuu");
    await settle(() => watched.perm("cody").isSuspended);
    expect(watched.perm("cody").isSuspended).toBe(true);
    expect(watched.state.memory).toBe(1);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "kingDrasil" },
        battleArea: [
          { card: "BT12-094", as: "yuu" },
          { card: "BT12-065", as: "sephiroth" },
        ],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: [...FILLER],
      },
    });
    await locked.ready();
    locked.state.memory = 2;
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("sephiroth").permanentId,
        instanceId: locked.inst("mercury").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("yuu").permanentId,
        instanceId: locked.inst("mercury").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(locked.perm("yuu").topCard.cardId).toBe("BT12-094");
    expect(locked.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2201)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [{ card: "BT1-010", as: "bonusCard" }],
        },
      },
      { autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "yuu");
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusCard").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2202)", async () => {
    const fresh = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu", enteredThisTurn: true }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
        },
        1: { security: 2, deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    await digivolveOntoTamer(fresh, "yuu");
    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("yuu").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(fresh.perm("yuu").isSuspended).toBe(false);

    const established = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
        },
        1: { security: 2, deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    await digivolveOntoTamer(established, "yuu");
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("yuu").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon is deleted (Q2203)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 9000, suspended: true }], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "yuu");
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    const seat = s.state.players[0]!;
    expect(seat.battleArea.filter(({ topCard }) => topCard.cardId === "BT12-094")).toHaveLength(0);

    await attackOversizedBlocker(s, "yuu");
    expect(seat.battleArea).toHaveLength(0);
    expect(seat.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT12-066", "BT12-094"]);
  });

  it("does not give the Digimon the Tamer source's [Security] effect (Q2204)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
          security: [{ card: "BT12-094", as: "securityYuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "yuu");
    const seat = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("yuu"));
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-066"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityYuu"));
    await settle(() => seat.battleArea.length === 2);
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["BT12-066", "BT12-094"]);
  });

  it("gives the Digimon the Tamer source's inherited effect (Q2205)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-023", as: "tenWarriors" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
          security: [{ card: "BT1-011", as: "topSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 9000, suspended: true }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "tenWarriors");
    expect(s.perm("tenWarriors").stack.map(({ cardId }) => cardId)).toEqual(["AD1-023"]);

    await attackOversizedBlocker(s, "tenWarriors");
    const seat = s.state.players[0]!;
    expect(seat.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-066"]);
    expect(seat.security).toHaveLength(0);
    expect(seat.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("topSecurity").instanceId);
  });

  it("trashes the Tamer digivolution card when the Digimon digivolved on top of it is deleted (Q2206)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "yuu" }],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [...FILLER],
        },
      },
      { autoSelectCards: true },
    );
    await digivolveOntoTamer(s, "yuu");
    const seat = s.state.players[0]!;
    const tamerInstanceId = s.perm("yuu").stack[0]!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("yuu").permanentId])).toBe(1);
    await settle();
    expect(seat.battleArea).toHaveLength(0);
    expect(seat.trash.map(({ instanceId }) => instanceId)).toContain(tamerInstanceId);
    expect(seat.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT12-066", "BT12-094"]);
    expect(seat.hand.some(({ cardId }) => cardId === "BT12-094")).toBe(false);
  });

  it("commits to the declared digivolution onto a Tamer and rejects it when nothing can digivolve (Q4656)", async () => {
    const committed = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "yuu" }],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: [...FILLER],
      },
    });
    committed.state.memory = 2;
    expect(
      committed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: committed.perm("yuu").permanentId,
        instanceId: committed.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => committed.perm("yuu").topCard.cardId === "BT12-066");
    expect(committed.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT12-066")).toBe(
      false,
    );
    expect(committed.perm("yuu").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(committed.state.memory).toBe(0);

    const nothingToDigivolve = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "blueTamer" }],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: [...FILLER],
      },
    });
    nothingToDigivolve.state.memory = 2;
    expect(
      nothingToDigivolve.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nothingToDigivolve.perm("blueTamer").permanentId,
        instanceId: nothingToDigivolve.inst("mercury").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(nothingToDigivolve.perm("blueTamer").topCard.cardId).toBe("BT1-086");
    expect(nothingToDigivolve.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-066"]);
    expect(nothingToDigivolve.state.memory).toBe(2);
  });
});
