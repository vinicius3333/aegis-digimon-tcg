import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-030.js";
import "../BT13/BT13-007.js";
import "../BT17/BT17-079.js";
import "../BT5/BT5-091.js";
import "./BT18-045.js";
import "./BT18-047.js";
import "./BT18-090.js";
import { compiled } from "./BT18-050.js";

describe("BT18-050 Petaldramon", () => {
  it("unsuspends the exact qualifying level-4 Vegetation Digimon on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Unsuspend", optional: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend", optional: true }] },
      { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          battleArea: [
            { card: "BT18-047", as: "vegetation", suspended: true },
            { card: "BT1-078", as: "nearTrait", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("vegetation").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    await settle(() => !s.perm("vegetation").isSuspended);

    expect(s.perm("vegetation").isSuspended).toBe(false);
    expect(s.perm("nearTrait").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("rejects a level-5 Vegetation Digimon and an opposing qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          battleArea: [{ card: "BT1-078", as: "level5", suspended: true }],
        },
        1: { battleArea: [{ card: "BT18-047", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("level5").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("may refuse the optional unsuspend without changing a qualifying Plant", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          battleArea: [{ card: "BT18-047", as: "vegetation", suspended: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petaldramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("vegetation").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("digivolves from Arbormon for 1 and unsuspends a qualifying Plant", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-047", as: "arbormon", suspended: true }],
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("arbormon").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("arbormon").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("arbormon").topCard?.cardId === "BT18-050");

    expect(s.state.memory).toBe(4);
    expect(s.perm("arbormon").stack.at(-1)?.cardId).toBe("BT18-047");
    expect(s.perm("arbormon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("suspends only one opposing Digimon on its inherited host's first attack", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-050"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("first").topCard!.instanceId, s.perm("second").topCard!.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("second").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
describe("BT18-050 Petaldramon — KB Q&A rulings", () => {
  const ZOE = "BT18-090";
  const TAKUYA = "BT17-079";
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  const digivolve = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  const digivolved = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    settle(
      () =>
        s.perm(baseAlias).topCard?.instanceId === s.inst(cardAlias).instanceId && s.state.pendingDecision === undefined,
    );

  const attackPlayer = (s: EngineSetup, attackerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    });

  it("does not treat a Tamer base as a digivolving Digimon: 'when a Digimon digivolves' watchers stay silent and a 'Digimon can't digivolve' lock does not stop it (Q6624)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-091", as: "takumi" },
            { card: ZOE, as: "zoe" },
            { card: "BT18-047", as: "arbormon" },
          ],
          hand: [
            { card: "BT18-050", as: "tamerRoutePetaldramon" },
            { card: "BT18-050", as: "digimonRoutePetaldramon" },
          ],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await watched.ready();
    watched.state.memory = 10;

    expect(digivolve(watched, "zoe", "tamerRoutePetaldramon")).toEqual({ ok: true });
    await digivolved(watched, "zoe", "tamerRoutePetaldramon");
    expect(watched.state.memory).toBe(7);
    expect(watched.perm("takumi").isSuspended).toBe(false);

    expect(digivolve(watched, "arbormon", "digimonRoutePetaldramon")).toEqual({ ok: true });
    await digivolved(watched, "arbormon", "digimonRoutePetaldramon");
    expect(watched.perm("takumi").isSuspended).toBe(true);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: ZOE, as: "zoe" },
          { card: "BT18-047", as: "arbormon" },
        ],
        hand: [
          { card: "BT18-050", as: "tamerRoutePetaldramon" },
          { card: "BT18-050", as: "digimonRoutePetaldramon" },
        ],
        deck: [...FILLER],
      },
      1: { deck: [...FILLER] },
    });
    await locked.ready();
    locked.state.memory = 10;

    expect(digivolve(locked, "arbormon", "digimonRoutePetaldramon")).toMatchObject({ ok: false });
    expect(locked.perm("arbormon").topCard?.cardId).toBe("BT18-047");
    expect(digivolve(locked, "zoe", "tamerRoutePetaldramon")).toEqual({ ok: true });
    await digivolved(locked, "zoe", "tamerRoutePetaldramon");
    expect(locked.perm("zoe").stack.map(({ instanceId }) => instanceId)).toContain(locked.inst("zoe").instanceId);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6625)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUYA, as: "redTamer" },
            { card: ZOE, as: "zoe" },
          ],
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          deck: [{ card: "BT1-009", as: "bonusDraw" }, "BT1-010"],
        },
        1: { deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const handIds = () => s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(digivolve(s, "redTamer", "petaldramon")).toMatchObject({ ok: false });
    expect(handIds()).toEqual([s.inst("petaldramon").instanceId]);

    expect(digivolve(s, "zoe", "petaldramon")).toEqual({ ok: true });
    await digivolved(s, "zoe", "petaldramon");
    expect(handIds()).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("can't attack the turn it digivolves from a Tamer played this turn, but can from an older Tamer (Q6626)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: ZOE, as: "freshZoe", enteredThisTurn: true },
            { card: ZOE, as: "establishedZoe" },
          ],
          hand: [
            { card: "BT18-050", as: "freshPetaldramon" },
            { card: "BT18-050", as: "establishedPetaldramon" },
          ],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(digivolve(s, "freshZoe", "freshPetaldramon")).toEqual({ ok: true });
    await digivolved(s, "freshZoe", "freshPetaldramon");
    expect(attackPlayer(s, "freshZoe")).toMatchObject({ ok: false });
    expect(s.perm("freshZoe").isSuspended).toBe(false);

    expect(digivolve(s, "establishedZoe", "establishedPetaldramon")).toEqual({ ok: true });
    await digivolved(s, "establishedZoe", "establishedPetaldramon");
    expect(attackPlayer(s, "establishedZoe")).toEqual({ ok: true });
    await settle();
    expect(s.perm("establishedZoe").isSuspended).toBe(true);
  });

  it("keeps the Tamer it digivolved from as a digivolution card and trashes it when it leaves the field (Q6627)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ZOE, as: "zoe" }],
          hand: [{ card: "BT18-050", as: "petaldramon" }],
          deck: [...FILLER],
        },
        1: {
          deck: [...FILLER],
          battleArea: [{ card: "BT1-030", as: "wall", dp: 9000, suspended: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const zoeId = s.inst("zoe").instanceId;

    expect(digivolve(s, "zoe", "petaldramon")).toEqual({ ok: true });
    await digivolved(s, "zoe", "petaldramon");
    const petaldramonPermanentId = s.perm("zoe").permanentId;
    expect(s.perm("zoe").stack.map(({ instanceId }) => instanceId)).toContain(zoeId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: petaldramonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([zoeId, s.inst("petaldramon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6628)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-050", as: "petaldramon", under: [{ card: ZOE, as: "stackedZoe" }] }],
          security: [{ card: ZOE, as: "securityZoe" }],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const effectTriggeredFrom = (instanceId: string) =>
      s.events.some((event) => event.kind === "effectTriggered" && event.sourceInstanceId === instanceId);
    const inBattleArea = (instanceId: string) =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instanceId);

    // No intent reveals a battle-area Digimon as a security card, so fire the security-skill
    // window directly on the permanent: a gained [Security] effect would trigger from the stacked Zoe.
    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("petaldramon"));
    await settle();

    expect(effectTriggeredFrom(s.inst("stackedZoe").instanceId)).toBe(false);
    expect(inBattleArea(s.inst("stackedZoe").instanceId)).toBe(false);
    expect(s.perm("petaldramon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("stackedZoe").instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityZoe"));
    await settle(() => inBattleArea(s.inst("securityZoe").instanceId));

    expect(effectTriggeredFrom(s.inst("securityZoe").instanceId)).toBe(true);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6629)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-050", as: "withTakuya", under: [TAKUYA] },
          { card: "BT18-050", as: "withoutTakuya", under: ["BT18-045"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withTakuya").currentDP).toBe(8000);
    expect(s.perm("withoutTakuya").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });
});
