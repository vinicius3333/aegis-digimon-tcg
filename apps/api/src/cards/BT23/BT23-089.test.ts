import { getCardDefinition } from "@aegis/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { cite } from "../../engine/conformance/_kb.js";
import "../index.js";
import { compiled } from "./BT23-089.js";

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

const SAME_LEVEL_STACK = ["BT2-056", "BT22-031"];
const MIXED_LEVEL_STACK = ["BT2-056", "BT23-006"];
const HIDDEN_LEVEL_STACK = [
  { card: "BT2-056", faceUp: false },
  { card: "BT22-031", faceUp: false },
];

describe("BT23-089 Takumi Aiba", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0293",
      "4-7-9/10: face-down stacked cards have no referenceable card information",
      "1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f",
    );
  });
  it("matches every catalog field and printed text", () => {
    expect(getCardDefinition("BT23-089")).toMatchObject({
      cardId: "BT23-089",
      nameEn: "Takumi Aiba",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n" +
        "[All Turns] When any of your Digimon with the [CS]\u00a0trait would leave the battle area, by " +
        "suspending this Tamer and trash 2 same-level cards from 1 of your [CS]\u00a0trait Digimon's " +
        "digivolution cards, they don't leave.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the prevention as an all-affecting battle-area replacement with a hosted pair cost", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      optional: true,
      affectsAll: true,
      target: {
        count: "all",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          zone: "battleArea",
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
      },
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          {
            kind: "trash",
            target: {
              count: 2,
              filter: {
                zone: "digivolutionCards",
                sameHost: true,
                sameLevelPair: true,
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  zone: "battleArea",
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
              },
            },
          },
        ],
      },
    });
  });

  it("gains 1 memory at the start of its controller's main phase while the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no memory when the opponent controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: { deck: ["BT1-013", "BT1-014"], security: NEUTRAL_SECURITY },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an opponent Digimon that is only in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        breeding: { card: "BT23-006", as: "opponentBreeding" },
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the opponent's own start of main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-089", as: "takumi" },
          { card: "BT1-009", as: "ownDigimon" },
        ],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        hand: [{ card: "BT1-010", as: "opponentNeutral" }],
        deck: ["BT1-013", "BT1-014", "BT1-011"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  function opponentBlockers() {
    return {
      battleArea: [
        { card: "BT1-009", as: "bigA", dp: 12_000, suspended: true },
        { card: "BT1-009", as: "bigB", dp: 12_000, suspended: true },
      ],
      hand: [{ card: "BT1-010", as: "opponentSpare" }],
      deck: ["BT1-013", "BT1-014", "BT1-012"],
      security: NEUTRAL_SECURITY,
    };
  }

  async function reachMainPhase(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
    await advance(s.engine).waitForMainPhase(seat);
  }

  async function openOwnTurn(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<unknown> }> {
    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    return { loop };
  }

  async function attackInto(s: ReturnType<typeof setupEngine>, attacker: string, defender: string) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "permanent", permanentId: s.perm(defender).permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  }

  it("pays the compound cost on the OPPONENT's turn to keep a [CS] Digimon deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;
    const stackIds = s.perm("angewomon").stack.map((card) => card.instanceId);
    expect(stackIds).toHaveLength(2);

    const { loop } = await openOwnTurn(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: angewomonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("angewomon").isSuspended).toBe(true);
    expect(s.perm("takumi").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    const trashBefore = s.state.players[0]!.trash.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: angewomonPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takumi").isSuspended && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(angewomonPermanentId);
    expect(s.perm("angewomon").topCard?.cardId).toBe("BT23-031");
    expect(s.perm("angewomon").stack).toHaveLength(0);
    expect(s.perm("takumi").isSuspended).toBe(true);
    const trashed = s.state.players[0]!.trash.slice(trashBefore).map((card) => card.instanceId);
    expect(trashed.sort()).toEqual([...stackIds].sort());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets the controller decline: the Digimon leaves and nothing is paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;
    const angewomonId = s.perm("angewomon").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomon", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angewomonPermanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(angewomonId);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay from a stack without a same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: MIXED_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomon", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angewomonPermanentId)).toBe(
      false,
    );
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not infer a same-level pair from face-down cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: HIDDEN_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("angewomon").permanentId;
    const topId = s.perm("angewomon").topCard!.instanceId;
    const hiddenIds = s.perm("angewomon").stack.map((card) => card.instanceId);

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomon", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([...hiddenIds, topId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use a public face-down EX9 source to satisfy the same-level payment", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT1-070", as: "base" },
          ],
          hand: [{ card: "EX9-043", as: "metal" }, { card: "BT22-064", as: "dia" }, "BT1-009"],
          trash: [{ card: "BT1-070", as: "hiddenSource" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-085", as: "opponentRedTamer" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 10;
    const { loop } = await openOwnTurn(s);
    const basePermanentId = s.perm("base").permanentId;
    const metalId = s.inst("metal");
    const hiddenSourceId = s.inst("hiddenSource").instanceId;
    preferInstanceIds.push(basePermanentId);
    const respondOptional = async (accept: boolean) => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(decision.seat, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    };

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: basePermanentId, instanceId: metalId.instanceId }),
    ).toEqual({
      ok: true,
    });
    await respondOptional(true);
    await settle(() => s.perm("base").topCard?.cardId === "EX9-043" && s.state.pendingDecision === undefined);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(hiddenSourceId);
    expect(s.perm("base").stack.find((card) => card.instanceId === hiddenSourceId)?.faceUp).toBe(false);

    const diaId = s.inst("dia");
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: basePermanentId, instanceId: diaId.instanceId }),
    ).toEqual({
      ok: true,
    });
    await respondOptional(false);
    await settle(() => s.perm("base").topCard?.cardId === "BT22-064" && !observe(s.engine).isAttacking());
    const stackAfterPublicProduction = s.perm("base").stack.map((card) => card.instanceId);
    expect(stackAfterPublicProduction).toEqual([hiddenSourceId, s.inst("base").instanceId, metalId.instanceId]);
    expect(s.perm("base").stack.find((card) => card.instanceId === hiddenSourceId)?.faceUp).toBe(false);
    expect(stackAfterPublicProduction.filter((id) => id === hiddenSourceId)).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === diaId.instanceId));
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === basePermanentId)).toBe(false);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hiddenSourceId, ...stackAfterPublicProduction, diaId.instanceId]),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay a second time while this Tamer is already suspended by the first payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomonA", under: SAME_LEVEL_STACK },
            { card: "BT23-031", as: "angewomonB", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentA = s.perm("angewomonA").permanentId;
    const permanentB = s.perm("angewomonB").permanentId;
    const bId = s.perm("angewomonB").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomonA", "bigA");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentA)).toBe(true);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.perm("angewomonA").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);

    await attackInto(s, "angewomonB", "bigB");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentB)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(bId);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not protect a Digimon without the [CS] trait even when the cost is payable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
            { card: "BT1-013", as: "plain" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const plainPermanentId = s.perm("plain").permanentId;
    const plainId = s.perm("plain").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "plain", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === plainPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([plainId]);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.perm("angewomon").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not protect the opponent's [CS] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
            { card: "BT1-009", as: "attacker", dp: 12_000 },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT23-006", as: "opponentCs", suspended: true }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opponentCsPermanentId = s.perm("opponentCs").permanentId;
    const opponentCsId = s.perm("opponentCs").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "attacker", "opponentCs");

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentCsPermanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([opponentCsId]);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.perm("angewomon").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("saves every [CS] Digimon leaving together for a single payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomonA", under: SAME_LEVEL_STACK },
            { card: "BT23-031", as: "angewomonB", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
          hand: [{ card: "BT25-093", as: "flare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentIds = [s.perm("angewomonA").permanentId, s.perm("angewomonB").permanentId];

    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    s.state.memory = 5;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("takumi").isSuspended && s.state.pendingDecision === undefined);

    for (const permanentId of permanentIds) {
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(true);
    }
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    const stackSizes = [s.perm("angewomonA").stack.length, s.perm("angewomonB").stack.length].sort();
    expect(stackSizes).toEqual([0, 2]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-089", as: "securityTakumi" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const takumiId = s.inst("securityTakumi").instanceId;

    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === takumiId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === takumiId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === takumiId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
