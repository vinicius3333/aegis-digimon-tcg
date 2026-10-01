import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-089.js";
import "../BT16/BT16-056.js";
import "../BT19/BT19-033.js";
import "../BT9/BT9-074.js";
import "../BT9/BT9-091.js";
import "../ST13/ST13-03.js";
import "./ST10-06.js";
import "./ST10-09.js";

describe("ST10-06 Mastemon", () => {
  it("places a yellow or purple Digimon from trash on top of security when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "base" }],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "ST10-07", as: "secured" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === s.inst("secured").instanceId));
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("secured").instanceId)).toBe(false);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
  });

  it("plays a level 5 or lower Digimon from security after DNA digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow" },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "ST10-14", as: "existingSecurity" }],
          trash: [{ card: "ST10-11", as: "played" }],
        },
        1: { battleArea: [{ card: "ST10-09", as: "target" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.players[0]!.security.every((card) => card.instanceId !== s.inst("played").instanceId)).toBe(true);
    const securityChoice = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(s.inst("played").instanceId),
    )?.req;
    expect(securityChoice?.options?.candidateInstanceIds).toEqual([s.inst("played").instanceId]);
    expect(securityChoice?.options).toMatchObject({ min: 0, max: 1 });
    expect(securityChoice?.options?.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("played").instanceId, cardId: "ST10-11" },
        { instanceId: s.inst("existingSecurity").instanceId, cardId: "ST10-14" },
      ]),
    );
  });

  it("deletes an opponent Digimon no higher than another Digimon played by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-06", as: "mastemon", suspended: true }],
          security: [{ card: "ST10-09", as: "witchmon" }],
        },
        1: {
          battleArea: [
            { card: "ST10-11", as: "attacker" },
            { card: "ST10-09", as: "target" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
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
    await settle(() =>
      s.state.players[1]!.battleArea.every((p) => p.topCard.instanceId !== s.inst("target").instanceId),
    );
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([s.inst("attacker").instanceId]);
  });

  it("runs the Mastemon and Meiko deck line by placing and playing Meicoomon from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
            { card: "BT9-091", as: "meiko" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "BT9-074", as: "meicoomon" }],
        },
        1: { battleArea: [{ card: "ST10-09", as: "deleteTarget" }] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 0;
    const meicoomonId = s.inst("meicoomon").instanceId;
    const targetId = s.perm("deleteTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("purpleMaterial").permanentId],
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId) &&
        s.perm("meiko").isSuspended &&
        s.state.memory === 1,
    );

    expect(s.state.players[0]!.security.some((card) => card.instanceId === meicoomonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("meiko").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});

function battleAreaInstanceIds(s: EngineSetup, seat: 0 | 1): string[] {
  return Array.from(s.state.players[seat]!.battleArea, (permanent) => permanent.topCard.instanceId);
}

function securityInstanceIds(s: EngineSetup, seat: 0 | 1): string[] {
  return Array.from(s.state.players[seat]!.security, (card) => card.instanceId);
}

function mastemonPlayWatcherResolved(s: EngineSetup): number {
  return s.events.findIndex(
    (event) =>
      event.kind === "effectResolved" && event.sourceCardId === "ST10-06" && event.effectKey.includes("whenPlayed"),
  );
}

function dnaDigivolveMastemon(s: EngineSetup, seat: 0 | 1 = 0) {
  return s.engine.applyIntent(seat, {
    type: "dnaDigivolve",
    materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("purpleMaterial").permanentId],
    instanceId: s.inst("mastemon").instanceId,
  });
}

describe("ST10-06 Mastemon — KB Q&A rulings", () => {
  it("a non-DNA digivolve only places the trash card in security and never plays from security (Q734)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "base" }],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "ST10-11", as: "playable", faceUp: true }],
          trash: [{ card: "ST10-07", as: "secured" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "bystander" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const playableId = s.inst("playable").instanceId;
    const securedId = s.inst("secured").instanceId;
    expect(s.inst("playable").faceUp).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => securityInstanceIds(s, 0).includes(securedId) && s.state.pendingDecision === undefined);
    await settle();

    expect(securityInstanceIds(s, 0).sort()).toEqual([playableId, securedId].sort());
    expect(battleAreaInstanceIds(s, 0)).not.toContain(playableId);
    expect(s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(playableId) === true)).toBe(false);
    // The security shuffle emits no event, but it re-hides every security card, so the
    // card seeded face up is face down only if "Then, shuffle" still ran.
    expect(Array.from(s.state.players[0]!.security, (card) => card.faceUp)).toEqual([false, false]);

    // Near miss: the same board with a DNA digivolve does search security and plays the card.
    const preferInstanceIds: string[] = [];
    const dna = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "ST10-11", as: "playable" }],
          trash: [{ card: "ST10-07", as: "secured" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "bystander" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await dna.ready();
    preferInstanceIds.push(dna.inst("playable").instanceId);
    expect(dnaDigivolveMastemon(dna)).toEqual({ ok: true });
    await settle(() => battleAreaInstanceIds(dna, 0).includes(dna.inst("playable").instanceId));

    expect(securityInstanceIds(dna, 0)).toEqual([dna.inst("secured").instanceId]);
  });

  it("[All Turns] triggers when a Security Digimon's [Security] effect plays it into the battle area (Q735)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-06", as: "mastemon", suspended: true }],
          security: [{ card: "ST10-09", as: "witchmon" }],
        },
        1: {
          battleArea: [
            { card: "ST10-11", as: "attacker" },
            { card: "ST10-09", as: "levelFour" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const witchmonId = s.inst("witchmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        battleAreaInstanceIds(s, 0).includes(witchmonId) &&
        !battleAreaInstanceIds(s, 1).includes(s.inst("levelFour").instanceId),
    );
    await advance(s.engine).finishAttack();

    expect(battleAreaInstanceIds(s, 0)).toContain(witchmonId);
    expect(battleAreaInstanceIds(s, 1)).toEqual([s.inst("attacker").instanceId]);
  });

  it("[All Turns] does not trigger when Mimi Tachikawa moves a Digimon from breeding to the battle area (Q736)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "ST10-06", as: "mastemon" }, "BT1-078"],
          breeding: { card: "BT1-064", as: "raised" },
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstVictim" },
            { card: "BT1-013", as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const mimiEffects = JSON.parse(s.perm("mimi").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(mimiEffects).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard.instanceId,
        effectKey: mimiEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    await settle();

    expect(battleAreaInstanceIds(s, 0)).toContain(s.inst("raised").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    // Near miss: a Digimon that IS played by an effect makes Mastemon delete a level 3 Digimon.
    const played = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-06", as: "mastemon", suspended: true }],
          security: [{ card: "ST10-09", as: "witchmon" }],
        },
        1: {
          battleArea: [
            { card: "ST10-11", as: "attacker" },
            { card: "BT1-013", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    played.state.turnSeat = 1;
    await played.ready();
    expect(
      played.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: played.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !battleAreaInstanceIds(played, 1).includes(played.inst("victim").instanceId));
    await advance(played.engine).finishAttack();
    expect(battleAreaInstanceIds(played, 1)).toEqual([played.inst("attacker").instanceId]);
  });

  it("uses the played Digimon's level from when [All Turns] triggered even after it digivolved to level 5 (Q737)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT19-038", as: "jaeger" }] },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "BT19-033", as: "dorulumon" }],
        },
        1: {
          battleArea: [
            { card: "ST10-09", as: "levelFour", dp: 9000 },
            { card: "ST10-11", as: "levelFive", dp: 9000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT19-033"], preferInstanceIds },
    );
    await s.ready();
    const levelFourId = s.inst("levelFour").instanceId;
    const levelFiveId = s.inst("levelFive").instanceId;
    preferInstanceIds.push(levelFiveId);

    expect(dnaDigivolveMastemon(s)).toEqual({ ok: true });
    await settle(() => !battleAreaInstanceIds(s, 1).includes(levelFourId) && s.state.pendingDecision === undefined);
    await settle();

    const played = s.state.players[0]!.battleArea.find((permanent) =>
      Array.from(permanent.stack, (card) => card.instanceId).includes(s.inst("dorulumon").instanceId),
    );
    expect(played?.topCard.instanceId).toBe(s.inst("jaeger").instanceId);
    const jaegerDigivolved = s.events.findIndex((event) => event.kind === "digivolved" && event.cardId === "BT19-038");
    expect(jaegerDigivolved).toBeGreaterThanOrEqual(0);
    expect(jaegerDigivolved).toBeLessThan(mastemonPlayWatcherResolved(s));
    expect(battleAreaInstanceIds(s, 1)).toEqual([levelFiveId]);
  });

  it("still deletes a Digimon up to the played Digimon's level after that Digimon left the battle area (Q738)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
            { card: "ST13-05", as: "host" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "ST13-03", as: "zubaEagermon" }],
        },
        1: {
          battleArea: [
            { card: "ST10-09", as: "levelFour", dp: 9000 },
            { card: "ST10-11", as: "levelFive", dp: 9000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["ST13-03"], preferInstanceIds },
    );
    await s.ready();
    const zubaEagermonId = s.inst("zubaEagermon").instanceId;
    const levelFourId = s.inst("levelFour").instanceId;
    const levelFiveId = s.inst("levelFive").instanceId;
    preferInstanceIds.push(levelFiveId);

    expect(dnaDigivolveMastemon(s)).toEqual({ ok: true });
    await settle(() => !battleAreaInstanceIds(s, 1).includes(levelFourId) && s.state.pendingDecision === undefined);
    await settle();

    const zubaEagermonResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST13-03",
    );
    expect(zubaEagermonResolved).toBeGreaterThanOrEqual(0);
    expect(zubaEagermonResolved).toBeLessThan(mastemonPlayWatcherResolved(s));
    expect(battleAreaInstanceIds(s, 0)).not.toContain(zubaEagermonId);
    expect(Array.from(s.perm("host").stack, (card) => card.instanceId)).toContain(zubaEagermonId);
    expect(battleAreaInstanceIds(s, 1)).toEqual([levelFiveId]);
  });

  it("an opponent's Publimon cannot trash when Mastemon's effect raises security to 3 and then back to 2 (Q2645)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "ST10-07", as: "ghostmon" }],
          security: ["ST10-14", "ST10-14"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT16-056", as: "publimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const ghostmonId = s.inst("ghostmon").instanceId;

    expect(dnaDigivolveMastemon(s)).toEqual({ ok: true });
    await settle(() => battleAreaInstanceIds(s, 0).includes(ghostmonId) && s.state.pendingDecision === undefined);
    await settle();

    expect(Array.from(s.state.players[0]!.security, (card) => card.cardId)).toEqual(["ST10-14", "ST10-14"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(battleAreaInstanceIds(s, 1)).toEqual([s.inst("publimon").instanceId]);

    // Near miss: a plain digivolve places the card but plays nothing, so security stays at 3 and Publimon trashes.
    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "base" }],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "ST10-07", as: "ghostmon" }],
          security: ["ST10-14", "ST10-14"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT16-056", as: "publimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    control.state.memory = 5;
    await control.ready();

    expect(
      control.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: control.perm("base").permanentId,
        instanceId: control.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => control.state.players[0]!.trash.length === 1);

    expect(control.state.players[0]!.security).toHaveLength(2);
    expect(control.state.players[0]!.trash).toHaveLength(1);
  });
});
