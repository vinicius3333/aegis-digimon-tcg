import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-060.js";
import "../BT10/BT10-039.js";
import "../BT10/BT10-041.js";
import "../BT10/BT10-086.js";
import "../BT10/BT10-105.js";
import "../EX2/EX2-018.js";
import "../EX4/EX4-023.js";
import "../ST10/ST10-14.js";
import { compiled } from "./BT9-103.js";
describe("BT9-103 Kongou", () => {
  it("matches catalog values and both opponent-turn restrictions in IR", () => {
    expect(getCardDefinition("BT9-103")).toMatchObject({
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Restrict",
              restriction: "attackPlayers",
              duration: "untilOpponentTurnEnd",
              target: { count: "all", filter: { controller: "opponent", playCostLte: 7 } },
            },
            { kind: "GlobalRestrict", restriction: "opponentCannotAddToSecurity", duration: "untilOpponentTurnEnd" },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("restricts opposing low-cost Digimon from attacking players", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-029"], hand: [{ card: "BT9-103", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT9-103"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT9-103")).toBe(true);
  });
});

type Setup = ReturnType<typeof setupEngine>;

const KONGOU_COLOR_SOURCE = { card: "BT2-056", as: "kongouColorSource" } as const;

async function playKongouAsSeatOne(s: Setup): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("kongou").instanceId));
  expect(advance(s.engine).ledgers.continuous.cannotAddSecurityFromEffect(0)).toBe(true);
}

function effectTriggeredFrom(s: Setup, cardId: string): boolean {
  return s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === cardId);
}

const TOP_OF_SECURITY = 0;
const BOTTOM_OF_SECURITY = 1;

async function playChaosDegradationMain(withKongou: boolean, placementIndex = TOP_OF_SECURITY): Promise<Setup> {
  const s = setupEngine(
    {
      0: {
        battleArea: ["BT1-045", "BT10-079"],
        hand: [{ card: "ST10-14", as: "chaos" }],
      },
      1: {
        battleArea: [{ ...KONGOU_COLOR_SOURCE, as: "target" }],
        hand: withKongou ? [{ card: "BT9-103", as: "kongou" }] : [],
        security: [{ card: "BT1-001", as: "oldTop" }],
      },
    },
    { preferOptionIndex: placementIndex, autoOrderTriggers: true, autoSelectCards: true },
  );
  if (withKongou) await playKongouAsSeatOne(s);
  s.state.turnSeat = 0;
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaos").instanceId));
  return s;
}

async function attackIntoChaosDegradationSecurity(withKongou: boolean): Promise<Setup> {
  const s = setupEngine(
    {
      0: { security: [{ card: "ST10-14", as: "chaos" }] },
      1: {
        battleArea: [{ ...KONGOU_COLOR_SOURCE, as: "attacker" }],
        hand: withKongou ? [{ card: "BT9-103", as: "kongou" }] : [],
      },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoOrderTriggers: true, autoSelectCards: true },
  );
  if (withKongou) await playKongouAsSeatOne(s);
  s.state.turnSeat = 1;
  await s.ready();
  const attackerTopId = s.perm("attacker").topCard.instanceId;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaos").instanceId) &&
      !observe(s.engine).isAttacking(),
  );
  expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === attackerTopId)).toBe(
    withKongou,
  );
  return s;
}

async function digivolveIntoMaidModeUsingPlugIn(withKongou: boolean): Promise<Setup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT10-039", as: "taomon" }],
        hand: [
          { card: "BT10-041", as: "maid" },
          { card: "BT10-105", as: "plugin" },
        ],
        security: [{ card: "BT1-001", as: "ownSecurity" }],
      },
      1: {
        battleArea: [KONGOU_COLOR_SOURCE],
        hand: withKongou ? [{ card: "BT9-103", as: "kongou" }] : [],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  if (withKongou) await playKongouAsSeatOne(s);
  s.state.turnSeat = 0;
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("taomon").permanentId,
      instanceId: s.inst("maid").instanceId,
    }),
  ).toEqual({ ok: true });
  const pluginId = s.inst("plugin").instanceId;
  await settle(() =>
    [...s.state.players[0]!.trash, ...s.state.players[0]!.security].some((card) => card.instanceId === pluginId),
  );
  expect(observe(s.engine).hasKeyword(s.perm("taomon"), "Blocker")).toBe(true);
  return s;
}

async function playMarineAngemonOnTheTurnAfter(withKongou: boolean): Promise<Setup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-060", as: "lowCost" },
          { card: "BT9-029", as: "highCost" },
        ],
        hand: [{ card: "EX2-018", as: "marineAngemon" }],
        deck: [{ card: "BT1-009", as: "deckTop" }],
        security: [{ card: "BT1-001", as: "ownSecurity" }],
      },
      1: {
        battleArea: [KONGOU_COLOR_SOURCE],
        hand: withKongou ? [{ card: "BT9-103", as: "kongou" }] : [],
        security: ["BT1-002"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  if (withKongou) await playKongouAsSeatOne(s);
  s.state.turnSeat = 0;
  s.state.memory = 11;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marineAngemon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-018"));
  return s;
}

async function playLevelThreeIntoAgumonExpert(withKongou: boolean): Promise<Setup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX4-023", as: "expert" }],
        hand: [{ card: "BT1-009", as: "revealed" }],
        security: [{ card: "BT1-012", as: "ownSecurity" }],
      },
      1: {
        battleArea: [KONGOU_COLOR_SOURCE],
        hand: [...(withKongou ? [{ card: "BT9-103", as: "kongou" }] : []), { card: "BT1-010", as: "played" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  if (withKongou) await playKongouAsSeatOne(s);
  s.state.turnSeat = 1;
  s.state.memory = 5;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
  await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
  return s;
}

describe("BT9-103 Kongou — KB Q&A rulings", () => {
  it("leaves the Digimon in play when Chaos Degradation's [Main] tries to place it in Kongou-protected security (Q747)", async () => {
    const protectedBoard = await playChaosDegradationMain(true);
    const target = protectedBoard.perm("target");
    expect(effectTriggeredFrom(protectedBoard, "ST10-14")).toBe(true);
    expect(protectedBoard.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      target.permanentId,
    );
    expect(protectedBoard.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      protectedBoard.inst("oldTop").instanceId,
    ]);
    expect(protectedBoard.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT9-103"]);
    assertNoLoudGap(protectedBoard);

    const unprotectedBoard = await playChaosDegradationMain(false);
    expect(unprotectedBoard.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("blocks security adds from an opponent's Digimon with play cost above 7 while the attack lock stays cost-bound (Q1908)", async () => {
    expect(getCardDefinition("EX2-018")?.playCost).toBeGreaterThan(7);
    const s = await playMarineAngemonOnTheTurnAfter(true);
    expect(observe(s.engine).isRestricted(s.perm("lowCost"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highCost"), "attackPlayers")).toBe(false);
    expect(effectTriggeredFrom(s, "EX2-018")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("ownSecurity").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    assertNoLoudGap(s);

    const unprotected = await playMarineAngemonOnTheTurnAfter(false);
    expect(unprotected.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      unprotected.inst("deckTop").instanceId,
      unprotected.inst("ownSecurity").instanceId,
    ]);
  });

  it("leaves the target Digimon in play when ST10-14 is used on the turn after Kongou, even when placing it at the bottom (Q1909)", async () => {
    const protectedBoard = await playChaosDegradationMain(true, BOTTOM_OF_SECURITY);
    expect(effectTriggeredFrom(protectedBoard, "ST10-14")).toBe(true);
    expect(protectedBoard.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      protectedBoard.perm("target").permanentId,
    );
    expect(protectedBoard.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      protectedBoard.inst("oldTop").instanceId,
    ]);
    expect(protectedBoard.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT9-103"]);
    assertNoLoudGap(protectedBoard);

    const unprotectedBoard = await playChaosDegradationMain(false, BOTTOM_OF_SECURITY);
    expect(unprotectedBoard.state.players[1]!.battleArea).toHaveLength(0);
    expect(unprotectedBoard.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT2-056"]);
    expect(unprotectedBoard.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      unprotectedBoard.inst("oldTop").instanceId,
    ]);

    const securityEffectBoard = await attackIntoChaosDegradationSecurity(true);
    expect(effectTriggeredFrom(securityEffectBoard, "ST10-14")).toBe(true);
    expect(securityEffectBoard.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(securityEffectBoard);

    const unprotectedSecurityEffectBoard = await attackIntoChaosDegradationSecurity(false);
    expect(unprotectedSecurityEffectBoard.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT2-056"]);
  });

  it("returns the rest of the revealed security cards after Omnimon (X Antibody) trashes one under Kongou (Q1910)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-109", as: "cost" }] }],
        },
        1: {
          battleArea: [KONGOU_COLOR_SOURCE, { card: "BT1-028", as: "target", suspended: true }],
          hand: [{ card: "BT9-103", as: "kongou" }],
          security: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "chosen" },
            { card: "BT1-003", as: "last" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("chosen").instanceId);
    await playKongouAsSeatOne(s);

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId));
    await settle(() => !observe(s.engine).isAttacking());

    const security = s.state.players[1]!.security;
    expect(security.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("first").instanceId, s.inst("last").instanceId].sort(),
    );
    expect(security.every((card) => card.faceUp === false)).toBe(true);
  });

  it("trashes the Option Sakuyamon: Maid Mode used instead of placing it on top of Kongou-protected security (Q1960)", async () => {
    const protectedBoard = await digivolveIntoMaidModeUsingPlugIn(true);
    const pluginId = protectedBoard.inst("plugin").instanceId;
    expect(protectedBoard.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      protectedBoard.inst("ownSecurity").instanceId,
    ]);
    expect(protectedBoard.state.players[0]!.trash.map((card) => card.instanceId)).toContain(pluginId);
    assertNoLoudGap(protectedBoard);

    const unprotectedBoard = await digivolveIntoMaidModeUsingPlugIn(false);
    expect(unprotectedBoard.state.players[0]!.security[0]?.instanceId).toBe(unprotectedBoard.inst("plugin").instanceId);
  });

  it("lets Agumon Expert activate but trashes its revealed card instead of adding it to Kongou-protected security (Q3464)", async () => {
    const s = await playLevelThreeIntoAgumonExpert(true);
    expect(effectTriggeredFrom(s, "EX4-023")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("ownSecurity").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("revealed").instanceId);
    assertNoLoudGap(s);

    const unprotected = await playLevelThreeIntoAgumonExpert(false);
    expect(unprotected.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      unprotected.inst("revealed").instanceId,
      unprotected.inst("ownSecurity").instanceId,
    ]);
  });
});
