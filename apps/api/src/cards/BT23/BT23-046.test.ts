import { getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-046.js";

const NBSP = "\u00a0";

const PRINTED_TEXT =
  `[Digivolve] Lv.5 w/[CS]${NBSP}trait: Cost 3 \n\n＜Fortitude＞ \n` +
  "[On Play] [When Digivolving] By suspending 1 Digimon or Tamer, until your opponent's turn ends, " +
  "1 of their Digimon or Tamers can't unsuspend.\n" +
  "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may change the " +
  `attack target to 1 of your suspended Digimon with [Vegetation], [Plant] or [Fairy]${NBSP}in any of its ` +
  `traits or the [CS]${NBSP}trait.`;

type PendingDecision = NonNullable<GameState["pendingDecision"]>;

async function chooseTarget(
  s: EngineSetup,
  seat: Seat,
  permanentId: string,
  previousDecisionId?: string,
): Promise<PendingDecision> {
  await settle(
    () =>
      s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== previousDecisionId,
  );
  const request = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "chooseTargets", instanceIds: [permanentId] },
    }),
  ).toEqual({ ok: true });
  return request;
}

function optionsOf(s: EngineSetup, decisionId: string) {
  return s.decisions.find(({ req }) => req.decisionId === decisionId)!.req.options;
}

async function passTurnToOpponent(s: EngineSetup, suspendByAttacking: string[]) {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  for (const alias of suspendByAttacking) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(alias).isSuspended && s.state.pendingDecision === undefined);
  }
  const ended = s.state.turnSeat === 0 ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
  expect(ended).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await s.ready();
  return { loop };
}

describe("BT23-046 Rosemon", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition("BT23-046")).toMatchObject({
      cardId: "BT23-046",
      set: "BT23",
      nameEn: "Rosemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Fairy", "CS"],
      effectText: PRINTED_TEXT,
    });
    expect(getCardDefinition("BT23-046")?.inheritedEffectText).toBeUndefined();
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((entry) => entry.trigger)).toEqual([
      "Static",
      "OnPlay",
      "WhenDigivolving",
      "OpponentsTurn",
    ]);
  });

  it("by suspending one Digimon or Tamer, restricts one opposing Digimon or Tamer from unsuspending", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "any", kind: ["Digimon", "Tamer"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("once per opponent turn may redirect an attack to a suspended Vegetation/Plant/Fairy/CS Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "RedirectAttack",
          optional: true,
          target: {
            filter: {
              controller: "mine",
              suspended: true,
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Vegetation", "Plant", "Fairy"], match: "traitContains" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("pays the By cost with its controller's own Tamer and still restricts an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-046", as: "rose" }],
          battleArea: [{ card: "BT1-089", as: "ownTamer" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oppDigimon" },
            { card: "BT1-085", as: "oppTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rose").instanceId })).toEqual({ ok: true });
    const costRequest = await chooseTarget(s, 0, s.perm("ownTamer").permanentId);
    await chooseTarget(s, 0, s.perm("oppDigimon").permanentId, costRequest.decisionId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(optionsOf(s, costRequest.decisionId)?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("rose").permanentId,
        s.perm("ownTamer").permanentId,
        s.perm("oppDigimon").permanentId,
        s.perm("oppTamer").permanentId,
      ]),
    );
    expect(s.perm("ownTamer").isSuspended).toBe(true);
    expect(s.perm("rose").isSuspended).toBe(false);
    expect(s.perm("oppDigimon").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppTamer"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ownTamer"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays the By cost with an opponent's Tamer when digivolving, and restricts a different opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-079", as: "base" }],
          hand: [{ card: "BT23-046", as: "rose" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oppDigimon" },
            { card: "BT1-085", as: "oppTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: true });
    const costRequest = await chooseTarget(s, 0, s.perm("oppTamer").permanentId);
    const targetRequest = await chooseTarget(s, 0, s.perm("oppDigimon").permanentId, costRequest.decisionId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(optionsOf(s, costRequest.decisionId)?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("oppTamer").permanentId, s.perm("oppDigimon").permanentId]),
    );
    expect(optionsOf(s, targetRequest.decisionId)?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("oppDigimon").permanentId, s.perm("oppTamer").permanentId]),
    );
    expect(optionsOf(s, targetRequest.decisionId)?.candidateInstanceIds).not.toContain(s.perm("base").permanentId);
    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(s.perm("oppDigimon").isSuspended).toBe(false);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("rose").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppTamer"), "unsuspend")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the optional By condition without paying or restricting (CR 15-7-4)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-046", as: "rose" }],
          battleArea: [{ card: "BT1-089", as: "ownTamer" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oppDigimon", suspended: true },
            { card: "BT1-012", as: "oppSpare", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rose").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("ownTamer").isSuspended).toBe(false);
    expect(s.perm("rose").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("oppSpare"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when the By cost cannot be paid at all", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-046", as: "rose" }], deck: ["BT1-012", "BT1-013"] },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rose").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("holds the restriction across the opponent's unsuspend step and drops it when that turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-079", as: "base" },
            { card: "BT1-013", as: "costFodder" },
          ],
          hand: [{ card: "BT23-046", as: "rose" }],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "oppDigimon", suspended: true }],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: true });
    await chooseTarget(s, 0, s.perm("costFodder").permanentId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("costFodder").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(true);
    expect(s.perm("oppDigimon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(false);
    expect(s.perm("oppDigimon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("oppDigimon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  const OPPONENT_SECURITY = ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"];
  const FILLER_DECK = ["BT1-012", "BT1-013", "BT1-011", "BT1-012", "BT1-013", "BT1-011"];

  it("redirects an opponent's player attack onto a suspended Fairy Digimon and spares the security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "rose" },
            { card: "BT1-079", as: "lily" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: OPPONENT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { loop } = await passTurnToOpponent(s, ["lily"]);
    const attackerId = s.perm("attacker").permanentId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.perm("lily").currentDP).toBe(6000);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("offers only own suspended Vegetation/Plant/Fairy/CS Digimon as the new attack target", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "rose" },
            { card: "BT1-079", as: "fairy" },
            { card: "BT1-071", as: "carnivorousPlant" },
            { card: "BT23-038", as: "csOnly", dp: 20_000 },
            { card: "BT1-013", as: "nonQualifying" },
            { card: "BT10-052", as: "unsuspendedVegetation" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: OPPONENT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const { loop } = await passTurnToOpponent(s, ["rose", "fairy", "carnivorousPlant", "csOnly", "nonQualifying"]);
    preferInstanceIds.push(s.perm("carnivorousPlant").permanentId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    const redirect = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.options?.timing === "OpponentsTurn",
    )!;
    const candidates = redirect.req.options?.candidateInstanceIds;

    expect(new Set(candidates)).toEqual(
      new Set([
        s.perm("rose").permanentId,
        s.perm("fairy").permanentId,
        s.perm("carnivorousPlant").permanentId,
        s.perm("csOnly").permanentId,
      ]),
    );
    expect(candidates).not.toContain(s.perm("nonQualifying").permanentId);
    expect(candidates).not.toContain(s.perm("unsuspendedVegetation").permanentId);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.perm("carnivorousPlant").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("never triggers when the only suspended Digimon carries none of the printed traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "rose" },
            { card: "BT1-013", as: "nonQualifying" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: OPPONENT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { loop } = await passTurnToOpponent(s, ["nonQualifying"]);
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore - 1);

    expect(s.decisions.some(({ req }) => req.options?.timing === "OpponentsTurn")).toBe(false);
    expect(s.perm("nonQualifying").currentDP).toBe(5000);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the redirect and let the attack reach the security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "rose" },
            { card: "BT1-079", as: "lily" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: OPPONENT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const { loop } = await passTurnToOpponent(s, ["lily"]);
    const attackerId = s.perm("attacker").permanentId;
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore - 1);

    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(true);
    expect(s.perm("lily").currentDP).toBe(6000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("redirects only the first attack of an opponent turn and resets on their next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "rose" },
            { card: "BT1-079", as: "lily" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerOne" },
            { card: "BT1-013", as: "attackerTwo" },
            { card: "BT1-011", as: "attackerThree" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-011", "BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lily").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lily").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    const securityBefore = s.state.players[0]!.security.length;
    const attackerOneId = s.perm("attackerOne").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerOneId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerOneId));
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore - 1);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.perm("attackerTwo").isSuspended).toBe(true);
    expect(s.perm("lily").currentDP).toBe(6000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lily").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lily").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    const securityBeforeThird = s.state.players[0]!.security.length;
    const attackerThreeId = s.perm("attackerThree").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerThreeId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerThreeId));
    expect(s.state.players[0]!.security).toHaveLength(securityBeforeThird);
    expect(s.perm("lily").currentDP).toBe(6000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("exposes Fortitude through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-046", as: "rose" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("rose"), "Fortitude")).toBe(true);
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
  });

  it("replays itself for free when a stacked copy is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-046", as: "rose", under: ["BT1-079"] }],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "slayer", dp: 15_000 }],
          security: OPPONENT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { loop } = await passTurnToOpponent(s, ["rose"]);
    const roseInstanceId = s.perm("rose").topCard.instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("slayer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("rose").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === roseInstanceId && permanent.stack.length === 0,
      ),
    );

    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === roseInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-079");
    expect(s.state.memory).toBe(memoryBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves for 3 from a green Lv.5 base on the printed route and draws the digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-079", as: "base" }],
          hand: [{ card: "BT23-046", as: "rose" }],
          deck: [
            { card: "BT1-012", as: "drawn" },
            { card: "BT1-013", as: "bottom" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("rose").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });

  it("digivolves for 3 from an off-color Lv.5 [CS] base through the alternate route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "base" }],
          hand: [{ card: "BT23-046", as: "rose" }],
          deck: [
            { card: "BT1-012", as: "drawn" },
            { card: "BT1-013", as: "bottom" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("rose").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects a Lv.5 base that is neither green nor [CS]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "base" }],
        hand: [{ card: "BT23-046", as: "rose" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.instanceId).toBe(baseInstanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("rose").instanceId]);
  });

  it("rejects a Lv.3 green [CS] base — the alternate route is level gated", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-037", as: "base" }],
        hand: [{ card: "BT23-046", as: "rose" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
  });
});
