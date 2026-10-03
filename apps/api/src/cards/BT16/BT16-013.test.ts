import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-013.js";
import "../index.js";

describe("BT16-013", () => {
  it("has Blast Digivolve and reduces all opposing Digimon by 5000 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: -5000 }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -5000 }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Silphymon"], cost: 3, isAlternate: true }]);
  });
  it("once per turn deletes an opposing 8000 DP or lower Digimon when security is removed, otherwise gains Security Attack +1", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [
            { kind: "Delete" },
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: 1 },
              condition: { kind: "ifThisEffectDidNotDelete" },
            },
          ],
        },
      ],
    }));

  it("reduces all opposing Digimon by 5000 on natural play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT16-013", as: "valkyrimon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 9000 },
          { card: "BT1-009", as: "second", dp: 7000 },
        ],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("valkyrimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 2000);

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
    // CR 15-11-2-2: a Digimon that enters afterwards is affected too.
    const lateEntrant = s.putOnBoard(1, "BT10-086");
    await advance(s.engine).recompute();
    expect(lateEntrant.currentDP - lateEntrant.baseDP).toBe(s.perm("first").currentDP - s.perm("first").baseDP);
  });

  it("reduces a Digimon played later in the turn by 5000 (Discord 1555352172206493706)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT16-013", as: "valkyrimon" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "current", dp: 9000 }],
        hand: [{ card: "BT1-019", as: "future" }],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("valkyrimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("current").currentDP === 4000);

    await advance(s.engine).verb.playInstances([s.inst("future").instanceId]);

    expect(s.perm("future").currentDP).toBe(1000);
  });

  it("reduces opposing Digimon by 5000 when naturally digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-012", as: "silphymon" }],
        hand: [{ card: "BT16-013", as: "valkyrimon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 9000 },
          { card: "BT1-009", as: "second", dp: 7000 },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("silphymon").permanentId,
        instanceId: s.inst("valkyrimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("silphymon").topCard?.cardId === "BT16-013");

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
  });

  it("deletes an opposing Digimon at the 8000 DP boundary when either player's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-013", as: "valkyrimon" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 9000 },
            { card: "BT16-012", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("grants Security Attack +1 when a security card is removed but no target is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-013", as: "valkyrimon" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 9000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).hasKeyword(s.perm("valkyrimon"), "SecurityAttack")).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(9000);
  });
});

const VALKYRIMON = "BT16-013";
const TK_TAKAISHI = "BT1-087";
const BLACKWARGREYMON = "BT5-069";
const HADES_FORCE = "BT11-107";
const MONODRAMON = "BT1-009";
const MUCHOMON = "BT1-013";
const FILLER = [MONODRAMON, MUCHOMON, MONODRAMON, MUCHOMON, MONODRAMON, MUCHOMON];

function isOnBoard(s: EngineSetup, seat: 0 | 1, permanentId: string): boolean {
  return s.state.players[seat]!.battleArea.some((permanent) => permanent.permanentId === permanentId);
}

async function attackPlayer(s: EngineSetup, seat: 0 | 1, attackerAlias: string): Promise<void> {
  expect(
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle();
}

describe("BT16-013 Valkyrimon — KB Q&A rulings", () => {
  it("activates when my own effect removes a card from my security stack (Q2606)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VALKYRIMON, as: "valkyrimon" }],
          hand: [{ card: TK_TAKAISHI, as: "tk" }],
          security: [MONODRAMON, MUCHOMON],
        },
        1: {
          battleArea: [
            { card: MONODRAMON, as: "boundary", dp: 8000 },
            { card: MONODRAMON, as: "tooStrong", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    const tooStrongId = s.perm("tooStrong").permanentId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => !isOnBoard(s, 1, boundaryId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(isOnBoard(s, 1, boundaryId)).toBe(false);
    expect(isOnBoard(s, 1, tooStrongId)).toBe(true);
  });

  it("gains <Security A. +1> again on my next turn after gaining it during my opponent's turn (Q2607)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VALKYRIMON, as: "valkyrimon" }],
          hand: [{ card: TK_TAKAISHI, as: "tk" }],
          deck: [...FILLER],
          security: [MONODRAMON, MUCHOMON],
        },
        1: {
          battleArea: [{ card: MONODRAMON, as: "attacker", dp: 9000 }],
          deck: [...FILLER],
          security: [MONODRAMON, MONODRAMON],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    await attackPlayer(s, 1, "attacker");
    await settle(() => observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack") === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(1);

    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(1);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack") === 2);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("activates only once when a <Security A. +1> attacker checks 2 security cards (Q2608)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: VALKYRIMON, as: "valkyrimon" },
            { card: BLACKWARGREYMON, as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: MONODRAMON, as: "first" },
            { card: MONODRAMON, as: "second" },
          ],
          security: [MONODRAMON, MONODRAMON, MONODRAMON],
        },
      },
      { autoSelectCards: true },
    );
    const opponentDigimonIds = [s.perm("first").permanentId, s.perm("second").permanentId];

    await attackPlayer(s, 0, "attacker");
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(opponentDigimonIds.filter((id) => isOnBoard(s, 1, id))).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(0);
  });

  it("checks an additional security card when the effect grants <Security A. +1> mid-attack (Q2609)", async () => {
    async function attackWithValkyrimon(opponentBattleArea: { card: string; as: string; dp: number }[]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: VALKYRIMON, as: "valkyrimon" }] },
          1: { battleArea: opponentBattleArea, security: [MONODRAMON, MONODRAMON, MONODRAMON] },
        },
        { autoSelectCards: true },
      );
      await attackPlayer(s, 0, "valkyrimon");
      await settle();
      return s;
    }

    const granted = await attackWithValkyrimon([{ card: MONODRAMON, as: "bystander", dp: 9000 }]);
    expect(observe(granted.engine).keywordAmount(granted.perm("valkyrimon"), "SecurityAttack")).toBe(1);
    expect(granted.state.players[1]!.security).toHaveLength(1);

    const deleted = await attackWithValkyrimon([{ card: MONODRAMON, as: "target", dp: 8000 }]);
    expect(deleted.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(deleted.engine).keywordAmount(deleted.perm("valkyrimon"), "SecurityAttack")).toBe(0);
    expect(deleted.state.players[1]!.security).toHaveLength(2);
  });

  it("deletes an 8000 DP <Security A. +1> attacker after its first check, preventing the second check (Q2610)", async () => {
    async function opponentAttacksWith(attackerDP: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: VALKYRIMON, as: "valkyrimon" }],
            security: [MONODRAMON, MONODRAMON, MONODRAMON],
          },
          1: { battleArea: [{ card: BLACKWARGREYMON, as: "attacker", dp: attackerDP }] },
        },
        { autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      const attackerId = s.perm("attacker").permanentId;
      await attackPlayer(s, 1, "attacker");
      await settle(() => !isOnBoard(s, 1, attackerId) || s.state.players[0]!.security.length === 1);
      return { s, attackerId };
    }

    const stopped = await opponentAttacksWith(8000);
    expect(isOnBoard(stopped.s, 1, stopped.attackerId)).toBe(false);
    expect(stopped.s.state.players[0]!.security).toHaveLength(2);

    const unstopped = await opponentAttacksWith(9000);
    expect(isOnBoard(unstopped.s, 1, unstopped.attackerId)).toBe(true);
    expect(unstopped.s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not activate when the checked card's [Security] effect removes it from the battle area first (Q2611)", async () => {
    async function attackIntoSecurity(securityCard: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: VALKYRIMON, as: "valkyrimon" },
              { card: MUCHOMON, as: "attacker" },
            ],
          },
          1: {
            battleArea: [{ card: MONODRAMON, as: "target" }],
            security: [securityCard, MONODRAMON],
          },
        },
        { autoSelectCards: true },
      );
      const valkyrimonId = s.perm("valkyrimon").permanentId;
      const targetId = s.perm("target").permanentId;
      await attackPlayer(s, 0, "attacker");
      await settle(() => s.state.players[1]!.security.length === 1);
      await settle();
      return { s, valkyrimonId, targetId };
    }

    const removed = await attackIntoSecurity(HADES_FORCE);
    expect(isOnBoard(removed.s, 0, removed.valkyrimonId)).toBe(false);
    expect(isOnBoard(removed.s, 1, removed.targetId)).toBe(true);

    const control = await attackIntoSecurity(MONODRAMON);
    expect(isOnBoard(control.s, 0, control.valkyrimonId)).toBe(true);
    expect(isOnBoard(control.s, 1, control.targetId)).toBe(false);
  });
});
