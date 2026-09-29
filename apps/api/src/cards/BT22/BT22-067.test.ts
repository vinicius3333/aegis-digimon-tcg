import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-067.js";
import "./index.js";
import "../BT13/BT13-007.js";
import "../BT17/BT17-079.js";
import "../BT9/BT9-090.js";
import "../EX2/EX2-045.js";

describe("BT22-067 LordKnightmon", () => {
  it("matches the printed card identity and keyword package", () => {
    expect(getCardDefinition("BT22-067")).toMatchObject({
      cardId: "BT22-067",
      nameEn: "LordKnightmon",
      colors: ["Black", "Red"],
      types: expect.arrayContaining(["CS"]),
      effectText: expect.stringContaining("1 of your Digimon gets +3000 DP"),
    });
  });

  it("registers complete compiled IR for both keywords, both buff/attack timings, and all player attacks", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(2);
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      optional: true,
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
    });
  });

  it("gates the Rie Kishibe evolution path at three security cards", () => {
    expect(
      digivolutionRequirementsFor("BT22-067")?.find((entry) => entry.names?.includes("Rie Kishibe")),
    ).toMatchObject({
      cost: 5,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("buffs an ally, attacks a player, then plays an eligible reveal and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-068", as: "attacker" }],
          hand: [{ card: "BT22-067", as: "lordknightmon" }],
          deck: ["BT1-009", "BT1-090", "EX5-007"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lordknightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));
    await settle();

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-090", "EX5-007"]),
    );
  });

  it("runs the reveal after Raid switches the player attack to the highest-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-067", as: "lordknightmon", dp: 12000 }],
          deck: ["BT1-009", "BT1-090", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 8000 },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const highId = s.perm("high").permanentId;
    const lordId = s.perm("lordknightmon").permanentId;
    const eligibleId = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: lordId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-090", "BT1-010"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("lordknightmon").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

const LORDKNIGHTMON = "BT22-067";
const RIE_KISHIBE = "BT22-090";
const RIZEGREYMON = "BT22-012";
const CALUMON = "EX2-045";
const KING_DRASIL = "BT13-007";
const MAKI_HIMEKAWA = "BT9-090";
const CALUMON_WATCHER: PermanentSpec = { card: CALUMON, as: "calumon" };
const MAKI_WATCHER: PermanentSpec = { card: MAKI_HIMEKAWA, as: "maki" };
const FILLER = ["BT1-010", "BT1-010", "BT1-010", "BT1-010"];

function digivolveLordKnightmonOnto(s: EngineSetup, baseAlias: string) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst("lordknightmon").instanceId,
    useAlternateCost: true,
  });
}

function attackPlayerWith(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

async function digivolvedFromRie(options: { rieEnteredThisTurn?: boolean } = {}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: RIE_KISHIBE, as: "base", enteredThisTurn: options.rieEnteredThisTurn ?? false }],
        hand: [{ card: LORDKNIGHTMON, as: "lordknightmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }, ...FILLER],
      },
      1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(digivolveLordKnightmonOnto(s, "base")).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === LORDKNIGHTMON && s.state.pendingDecision === undefined);
  expect(s.state.memory).toBe(0);
  return s;
}

async function digivolveBeside(watcher: PermanentSpec, base: PermanentSpec) {
  const s = setupEngine(
    {
      0: {
        battleArea: [base, watcher],
        hand: [{ card: LORDKNIGHTMON, as: "lordknightmon" }],
        deck: [...FILLER],
      },
      1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferTriggerKeys: [watcher.card] },
  );
  s.state.memory = 5;
  await s.ready();
  expect(digivolveLordKnightmonOnto(s, "base")).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === LORDKNIGHTMON);
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  await drainMicrotasks();
  return s;
}

async function expectKingDrasilLockToSkipRieRoute() {
  const s = setupEngine(
    {
      0: {
        breeding: { card: KING_DRASIL, as: "drasil" },
        battleArea: [
          { card: RIZEGREYMON, as: "rizegreymon" },
          { card: RIE_KISHIBE, as: "base" },
        ],
        hand: [{ card: LORDKNIGHTMON, as: "lordknightmon" }],
        deck: [...FILLER],
      },
      1: { deck: [...FILLER] },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(digivolveLordKnightmonOnto(s, "rizegreymon")).toMatchObject({ ok: false });
  expect(s.perm("rizegreymon").topCard.cardId).toBe(RIZEGREYMON);
  expect(digivolveLordKnightmonOnto(s, "base")).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === LORDKNIGHTMON);
  expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([RIE_KISHIBE]);
}

function raidBoard() {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: LORDKNIGHTMON, as: "lordknightmon" }],
        deck: [{ card: "BT1-009", as: "eligible" }, "BT1-090", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "defender", dp: 8000 }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferTriggerKeys: ["Raid"] },
  );
}

const promptIndex = (s: EngineSetup, matches: (promptText: string, timing?: string) => boolean) =>
  s.decisions.findIndex(({ req }) => matches(req.promptText, req.options?.timing));
const isRaidPrompt = (promptText: string) => promptText.includes("Raid");
const isRevealPrompt = (_promptText: string, timing?: string) => timing === "AllTurns";

describe("BT22-067 LordKnightmon — KB Q&A rulings", () => {
  it("cannot attack the turn it digivolves from a Tamer played that turn (Q4925)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: RIE_KISHIBE, as: "base" },
            { card: LORDKNIGHTMON, as: "lordknightmon" },
          ],
          deck: [...FILLER],
        },
        1: { security: ["BT1-010", "BT1-010"], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("base").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(digivolveLordKnightmonOnto(s, "base")).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === LORDKNIGHTMON && s.state.pendingDecision === undefined);

    expect(attackPlayerWith(s, "base")).toMatchObject({ ok: false });
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);

    const establishedRie = await digivolvedFromRie({ rieEnteredThisTurn: false });
    expect(attackPlayerWith(establishedRie, "base")).toEqual({ ok: true });
  });

  it.fails("can still activate the [All Turns] reveal after <Raid> switched the player attack to a Digimon (Q4926)", async () => {
    const s = raidBoard();
    await s.ready();

    expect(attackPlayerWith(s, "lordknightmon")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const raidIndex = promptIndex(s, isRaidPrompt);
    const revealIndex = promptIndex(s, isRevealPrompt);
    expect(raidIndex).toBeGreaterThanOrEqual(0);
    expect(revealIndex).toBeGreaterThan(raidIndex);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("lets <Raid> switch the attack target after the [All Turns] reveal resolved (Q4927)", async () => {
    const s = raidBoard();
    await s.ready();

    expect(attackPlayerWith(s, "lordknightmon")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const revealIndex = promptIndex(s, isRevealPrompt);
    const raidIndex = promptIndex(s, isRaidPrompt);
    expect(revealIndex).toBeGreaterThanOrEqual(0);
    expect(raidIndex).toBeGreaterThan(revealIndex);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-090", "BT1-010"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("digivolves from Rie Kishibe as a Tamer: no Digimon-digivolve watcher, and a can't-digivolve lock does not stop it (Q6688)", async () => {
    // Near-miss: digivolving from a Lv.5 [CS] Digimon fires both the watcher and [When Digivolving]'s attack.
    const fromDigimon = await digivolveBeside(CALUMON_WATCHER, { card: RIZEGREYMON, as: "base" });
    expect(fromDigimon.perm("calumon").isSuspended).toBe(true);
    expect(fromDigimon.perm("base").isSuspended).toBe(true);
    expect(fromDigimon.state.players[1]!.security.length).toBeLessThan(2);

    const fromRie = await digivolveBeside(CALUMON_WATCHER, { card: RIE_KISHIBE, as: "base" });
    expect(fromRie.perm("calumon").isSuspended).toBe(false);

    await expectKingDrasilLockToSkipRieRoute();
  });

  // Q6688 with Q2957: a Tamer digivolving as a Tamer is not "a Digimon would digivolve".
  it("does not offer a would-digivolve cost reducer when digivolving from Rie Kishibe (Q6688)", async () => {
    const fromDigimon = await digivolveBeside(MAKI_WATCHER, { card: RIZEGREYMON, as: "base" });
    expect(fromDigimon.perm("maki").isSuspended).toBe(true);
    expect(fromDigimon.perm("base").stack.map((card) => card.cardId)).toEqual([RIZEGREYMON]);

    const fromRie = await digivolveBeside(MAKI_WATCHER, { card: RIE_KISHIBE, as: "base" });
    expect(fromRie.perm("maki").isSuspended).toBe(false);
    expect(fromRie.perm("base").stack.map((card) => card.cardId)).toEqual([RIE_KISHIBE]);
    expect(fromRie.state.memory).toBe(0);
  });

  it("performs the digivolution bonus draw when digivolving from Rie Kishibe (Q6689)", async () => {
    const s = await digivolvedFromRie();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("keeps Rie Kishibe as a digivolution card that is trashed when LordKnightmon leaves the field (Q6690)", async () => {
    const s = await digivolvedFromRie();
    const rieCard = s.perm("base").stack[0]!;
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([RIE_KISHIBE]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [rieCard.instanceId, s.inst("lordknightmon").instanceId].sort(),
    );
  });

  it("does not gain the [Security] effect of Rie Kishibe in its digivolution cards (Q6691)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LORDKNIGHTMON, as: "lordknightmon", under: [{ card: RIE_KISHIBE, as: "stackRie" }] }],
          security: [{ card: RIE_KISHIBE, as: "securityRie" }],
        },
        1: { battleArea: [{ card: "BT17-063", as: "attacker" }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
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
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Control: the same [Security] effect plays Rie Kishibe when she is checked from security.
    const ownBattleArea = s.state.players[0]!.battleArea;
    expect(ownBattleArea.some((p) => p.topCard.instanceId === s.inst("securityRie").instanceId)).toBe(true);
    expect(ownBattleArea).toHaveLength(2);
    expect(s.perm("lordknightmon").stack.map((card) => card.instanceId)).toEqual([s.inst("stackRie").instanceId]);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("lordknightmon"), RIE_KISHIBE)).toBe(false);
  });

  it("gains the inherited effect of a Tamer card in its digivolution cards (Q6692)", async () => {
    const TAKUYA_KANBARA = "BT17-079";
    const onTurn = (turnSeat: 0 | 1, under: string[]) => {
      const s = setupEngine({ 0: { battleArea: [{ card: LORDKNIGHTMON, as: "lordknightmon", under }] } });
      s.state.turnSeat = turnSeat;
      return s;
    };

    const withTakuya = onTurn(0, [RIE_KISHIBE, TAKUYA_KANBARA]);
    await withTakuya.ready();
    expect(withTakuya.perm("lordknightmon").currentDP).toBe(14000);
    expect(observe(withTakuya.engine).hasPierce(withTakuya.perm("lordknightmon"))).toBe(true);
    expect(observe(withTakuya.engine).canUseInheritedEffect(withTakuya.perm("lordknightmon"), TAKUYA_KANBARA)).toBe(
      true,
    );

    const rieOnly = onTurn(0, [RIE_KISHIBE]);
    await rieOnly.ready();
    expect(rieOnly.perm("lordknightmon").currentDP).toBe(12000);
    expect(observe(rieOnly.engine).hasPierce(rieOnly.perm("lordknightmon"))).toBe(false);

    const opponentTurn = onTurn(1, [RIE_KISHIBE, TAKUYA_KANBARA]);
    await opponentTurn.ready();
    expect(opponentTurn.perm("lordknightmon").currentDP).toBe(12000);
  });
});
