import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-086.js";

async function runOwnTurn(s: EngineSetup, seat: 0 | 1): Promise<void> {
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(seat);
  advance(s.engine).endMainPhaseIfOpen(seat);
  await turn;
}

describe("BT23-086 Yuugo", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-086")).toMatchObject({
      cardId: "BT23-086",
      nameEn: "Yuugo",
      colors: ["Black", "Red"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["Zaxon", "CS"],
      effectText: expect.stringContaining("[Start of Your Turn] If you have 2 or less memory, set it to 3."),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "StartOfYourTurn",
      "OnPlay",
      "EndOfYourTurn",
      "Security",
    ]);
  });

  it("raises the start-of-turn memory to 3 only while Yuugo is in play", async () => {
    const withTamer = setupEngine(
      { 0: { battleArea: [{ card: "BT23-086", as: "yuugo" }], hand: [{ card: "ST1-02", as: "spare" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withTamer.state.memory = 2;
    await withTamer.ready();
    const turn = withTamer.engine.runOneTurn();
    await advance(withTamer.engine).waitForMainPhase(0);
    expect(withTamer.state.memory).toBe(3);
    advance(withTamer.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(withTamer);

    const control = setupEngine(
      { 0: { hand: [{ card: "ST1-02", as: "spare" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 2;
    await control.ready();
    const controlTurn = control.engine.runOneTurn();
    await advance(control.engine).waitForMainPhase(0);
    expect(control.state.memory).toBe(2);
    advance(control.engine).endMainPhaseIfOpen(0);
    await controlTurn;
  });

  it("leaves start-of-turn memory above 2 untouched", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-086", as: "yuugo" }], hand: [{ card: "ST1-02", as: "spare" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("pays the top security card and places a Zaxon Digimon from hand face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxon" },
            { card: "BT1-009", as: "plain" },
          ],
          security: [
            { card: "BT1-010", as: "securityTop" },
            { card: "BT1-011", as: "securityBottom" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const yuugoId = s.inst("yuugo").instanceId;
    const zaxonId = s.inst("zaxon").instanceId;
    const plainId = s.inst("plain").instanceId;
    const paidId = s.inst("securityTop").instanceId;
    const keptId = s.inst("securityBottom").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: yuugoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zaxonId));

    const player = s.state.players[0]!;
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === yuugoId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(player.security.map((card) => card.instanceId)).toEqual([keptId, zaxonId]);
    expect(player.security[0]!.faceUp).not.toBe(true);
    expect(player.security[1]!.faceUp).toBe(true);
    expect(player.hand.map((card) => card.instanceId).sort()).toEqual([paidId, plainId].sort());
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("places a Zaxon Digimon taken from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-086", as: "yuugo" }],
          trash: [
            { card: "BT23-045", as: "zaxon" },
            { card: "BT1-009", as: "plainTrash" },
          ],
          security: [{ card: "BT1-010", as: "securityTop" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const zaxonId = s.inst("zaxon").instanceId;
    const plainId = s.inst("plainTrash").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zaxonId));

    const player = s.state.players[0]!;
    expect(player.security).toHaveLength(1);
    expect(player.security[0]).toMatchObject({ instanceId: zaxonId, faceUp: true });
    expect(player.trash.map((card) => card.instanceId)).toEqual([plainId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("declining the On Play leaves the security stack and hand untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxon" },
          ],
          security: [{ card: "BT1-010", as: "securityTop" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const zaxonId = s.inst("zaxon").instanceId;
    const securityId = s.inst("securityTop").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-086"));

    const player = s.state.players[0]!;
    expect(player.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(player.hand.map((card) => card.instanceId)).toEqual([zaxonId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("cannot activate the On Play with an empty security stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxon" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const zaxonId = s.inst("zaxon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-086"));

    const player = s.state.players[0]!;
    expect(player.security).toHaveLength(0);
    expect(player.hand.map((card) => card.instanceId)).toEqual([zaxonId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("keeps the placed card revealed and checks it face up when the opponent attacks (Q5358, Q5359)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxon" },
            { card: "ST1-02", as: "spare" },
          ],
          security: [{ card: "BT1-010", as: "securityTop" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "raider" }],
          hand: [{ card: "ST1-02", as: "opponentSpare" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const zaxonId = s.inst("zaxon").instanceId;
    const raiderId = s.perm("raider").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zaxonId));
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: zaxonId, faceUp: true });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: zaxonId, faceUp: true });

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === zaxonId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === raiderId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("offers only [Zaxon] Digimon from the placement pool, never a [Zaxon] Tamer or a near-miss", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxonA" },
            { card: "BT23-060", as: "zaxonB" },
            { card: "BT2-066", as: "nearMiss" },
            { card: "BT23-083", as: "zaxonTamer" },
            { card: "BT1-009", as: "unrelated" },
          ],
          security: [
            { card: "BT1-010", as: "securityTop" },
            { card: "BT1-011", as: "securityKeep" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 6;
    await s.ready();
    const zaxonAId = s.inst("zaxonA").instanceId;
    const zaxonBId = s.inst("zaxonB").instanceId;
    const nearMissId = s.inst("nearMiss").instanceId;
    const zaxonTamerId = s.inst("zaxonTamer").instanceId;
    const unrelatedId = s.inst("unrelated").instanceId;
    const paidId = s.inst("securityTop").instanceId;
    const keptId = s.inst("securityKeep").instanceId;
    prefer.push(zaxonBId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zaxonBId));

    const placement = s.decisions.find(({ req }) => req.options?.candidateInstanceIds?.includes(zaxonAId));
    expect(placement).toBeDefined();
    expect([...placement!.req.options!.candidateInstanceIds!].sort()).toEqual([zaxonAId, zaxonBId].sort());
    expect(placement!.req.options!.candidateInstanceIds).not.toContain(nearMissId);
    expect(placement!.req.options!.candidateInstanceIds).not.toContain(zaxonTamerId);
    expect(placement!.req.options!.candidateInstanceIds).not.toContain(unrelatedId);

    const player = s.state.players[0]!;
    expect(player.security.map((card) => card.instanceId)).toEqual([keptId, zaxonBId]);
    expect(player.security[1]!.faceUp).toBe(true);
    expect(player.hand.map((card) => card.instanceId).sort()).toEqual(
      [zaxonAId, nearMissId, zaxonTamerId, unrelatedId, paidId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("reads the end-of-turn attack grant from the live top card after a public digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT10-064", as: "base" },
          ],
          hand: [
            { card: "BT2-066", as: "machinedramon" },
            { card: "ST1-02", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.perm("base").topCard!.instanceId;
    const machinedramonId = s.inst("machinedramon").instanceId;
    const securityId = s.inst("securityCard").instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: machinedramonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === machinedramonId && !s.state.pendingDecision);

    expect(s.perm("base").topCard?.cardId).toBe("BT2-066");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("yuugo").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q5361: shuffling the security stack turns the face-up placed card face down again", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-015", as: "zaxon" },
            { card: "BT1-087", as: "shuffler" },
          ],
          security: [
            { card: "BT1-010", as: "securityTop" },
            { card: "BT1-011", as: "securityBottom" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: prefer,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const zaxonId = s.inst("zaxon").instanceId;
    prefer.push(s.inst("securityBottom").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zaxonId));
    expect(s.state.players[0]!.security.find((card) => card.instanceId === zaxonId)?.faceUp).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087") &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(player.security.length).toBeGreaterThan(0);
    expect(player.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(player.security.some((card) => card.instanceId === zaxonId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("securityBottom").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("suspends Yuugo at end of turn so a level 6 Machine Digimon attacks the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT2-066", as: "machine" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const securityId = s.inst("securityCard").instanceId;

    await runOwnTurn(s, 0);

    expect(s.perm("yuugo").isSuspended).toBe(true);
    expect(s.perm("machine").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("also grants the end-of-turn attack to a level 6 Zaxon Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-034", as: "zaxon" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await runOwnTurn(s, 0);

    expect(s.perm("yuugo").isSuspended).toBe(true);
    expect(s.perm("zaxon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not attack when only an ineligible level or trait is on the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT1-042", as: "lowLevelMachine" },
            { card: "BT1-080", as: "wrongTrait" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await runOwnTurn(s, 0);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("lowLevelMachine").isSuspended).toBe(false);
    expect(s.perm("wrongTrait").isSuspended).toBe(false);
    expect(s.perm("yuugo").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("declining the end-of-turn effect leaves Yuugo unsuspended and the attack unmade", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT2-066", as: "machine" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await runOwnTurn(s, 0);

    expect(s.perm("yuugo").isSuspended).toBe(false);
    expect(s.perm("machine").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("cannot pay the end-of-turn cost while Yuugo is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo", suspended: true },
            { card: "BT2-066", as: "machine" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-010", as: "securityCard" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.perm("yuugo").isSuspended = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("machine").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          security: [{ card: "BT23-086", as: "securityYuugo" }],
          hand: [{ card: "ST1-02", as: "opponentSpare" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const yuugoId = s.inst("securityYuugo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === yuugoId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === yuugoId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === yuugoId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("compiles each printed clause into the expected IR", () => {
    const startOfTurn = compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn");
    expect(startOfTurn?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });

    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      from: ["hand", "trash"],
      toTop: false,
      faceUp: true,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand" },
      source: { count: 1, filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }] } },
    });

    const endOfTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(endOfTurn?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      target: {
        count: 1,
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          levels: [6],
          nameOrTrait: [{ tokens: ["Machine", "Zaxon"], match: "trait" }],
        },
      },
    });

    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true, filter: { isSelfRef: true } } }],
    });
  });

  it("restricts the end-of-turn attack to the player, not a suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT2-066", as: "machine" },
          ],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "bait", suspended: true }],
          security: [{ card: "BT1-010", as: "securityCard" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baitPermanentId = s.perm("bait").permanentId;

    await runOwnTurn(s, 0);

    const attackChoice = s.decisions.find(({ req }) => req.options?.candidateInstanceIds?.includes("player"));
    expect(attackChoice?.req.options?.candidateInstanceIds).toEqual(["player"]);
    expect(attackChoice?.req.options?.candidateInstanceIds).not.toContain(baitPermanentId);
  });
});
