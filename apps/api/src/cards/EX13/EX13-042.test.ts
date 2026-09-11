import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-042.js";

const CARD_ID = "EX13-042";

// Fixtures, all chosen so that playing them runs no [On Play] effect of their own:
//   BT9-057  Bearmon        play cost 2, [Beast]                     -> legal
//   ST14-04  Phascomon      play cost 3, [Dark Animal]               -> legal (substring "Animal")
//   BT14-008 Gizamon        play cost 3, [Sea Animal]                -> excluded by the printed rider
//   BT8-052  Drimogemon     play cost 5, [Beast]                     -> over the cost cap
//   EX5-041  Ebonwumon      play cost 7, [Holy Beast]/[Four Sovereigns] -> over the cost cap
//   BT1-009  Monodramon     play cost 2, [Mini Dragon]               -> no matching trait token
//   BT1-071  Vegiemon       Green Lv.4                               -> legal digivolution base
//   BT4-050  Liollmon       Green Lv.3                               -> illegal base (level)
//   BT1-014  Kokatorimon    Red Lv.4                                 -> illegal base (color)
const BEAST = "BT9-057";
const DARK_ANIMAL = "ST14-04";
const SEA_ANIMAL = "BT14-008";
const BEAST_COST_5 = "BT8-052";
const SOVEREIGN_COST_7 = "EX5-041";
const NO_TOKEN = "BT1-009";
const GREEN_LV4 = "BT1-071";

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

function allianceState(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
}

describe("EX13-042 Bastemon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Bastemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Beastkin"],
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      rarity: "R",
      maxCountInDeck: 4,
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("＜Alliance＞");
    expect(effectText).toContain(
      "[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 play cost 4 or lower Digimon card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits from your hand without paying the cost.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("＜Alliance＞");
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
    // No printed [Digivolve] header, so the IR carries no alternate requirement.
    expect(effectText).not.toContain("[Digivolve]");
  });

  it("compiles the printed keyword pair and one shared-use free-play window per printed timing", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.digivolutionRequirement).toBeUndefined();

    // Printed ＜Alliance＞: a main copy (this Digimon only) and an inherited copy (passes up).
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });

    const freePlay = {
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: {
          controllerDefault: "mine",
          zone: "hand",
          kind: ["Digimon"],
          playCostLte: 4,
          nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
          excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
        },
      },
    };
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "EX13-042/play-beast",
      actions: [freePlay],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "EX13-042/play-beast",
      actions: [freePlay],
    });
    expect(compiled.effects[1]?.isInherited).toBeUndefined();
    expect(compiled.effects[2]?.isInherited).toBeUndefined();
    // Both printed timings share the one printed [Once Per Turn].
    expect(compiled.effects[1]?.sharedUseKey).toBe(compiled.effects[2]?.sharedUseKey);
  });

  it("digivolves from a Green Lv.4 for the printed EvoCost of 3 and fires [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "bastemon" },
            { card: BEAST, as: "bearmon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("bastemon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    // Cost 3 only: the free play adds nothing to the memory swing.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(true);

    // Bearmon reached the battle area from hand as a fresh permanent with no stack.
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("bearmon").instanceId,
    );
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
    // Only the digivolution bonus draw is left in hand.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses illegal digivolution sources: a Green Lv.3 and a Red Lv.4", async () => {
    for (const base of ["BT4-050", "BT1-014"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "bastemon" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 6;
      await s.ready();

      for (const useAlternateCost of [false, true]) {
        const result = s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bastemon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        });
        expect(result.ok, `${base} alt=${useAlternateCost}`).toBe(false);
      }
      // Nothing moved and no memory was charged on either attempt.
      expect(s.state.memory).toBe(6);
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bastemon").instanceId]);
    }
  });

  it("plays a [Beast] Digimon for free on the [When Attacking] window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [
            { card: BEAST, as: "bearmon" },
            { card: NO_TOKEN, as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("bearmon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // "without paying the cost": memory is untouched by the play cost 2.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("bearmon").instanceId,
    );
    expect(played!.stack).toHaveLength(0);
    expect(played!.isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a [Dark Animal] Digimon on the substring reading while refusing [Sea Animal]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [
            { card: SEA_ANIMAL, as: "gizamon" },
            { card: DARK_ANIMAL, as: "phascomon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("phascomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // "Animal" matched [Dark Animal]; the printed rider kept [Sea Animal] out even though it also
    // contains "Animal".
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gizamon").instanceId]);
  });

  it("discriminates every printed leg of the filter in one window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [
            { card: SEA_ANIMAL, as: "seaAnimal" },
            { card: NO_TOKEN, as: "noToken" },
            { card: BEAST_COST_5, as: "beastCost5" },
            { card: SOVEREIGN_COST_7, as: "sovereignCost7" },
            { card: BEAST, as: "onlyMatch" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("onlyMatch").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    // Everything except the single legal candidate stayed in hand, in its original order.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("seaAnimal").instanceId,
      s.inst("noToken").instanceId,
      s.inst("beastCost5").instanceId,
      s.inst("sovereignCost7").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("does nothing when the hand holds no legal candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [
            { card: SEA_ANIMAL, as: "seaAnimal" },
            { card: BEAST_COST_5, as: "beastCost5" },
            { card: NO_TOKEN, as: "noToken" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays nothing when the controller declines the optional window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [{ card: BEAST, as: "bearmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bearmon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("spends the one shared use on [When Digivolving], closing the same turn's [When Attacking]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "bastemon" },
            { card: BEAST, as: "first" },
            { card: BEAST, as: "second" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("bastemon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    // The [When Digivolving] copy played exactly one of the two Bearmon.
    const playedFirst = s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard.instanceId === s.inst("first").instanceId,
    );
    const playedSecond = s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard.instanceId === s.inst("second").instanceId,
    );
    expect(playedFirst !== playedSecond).toBe(true);
    const handAfterDigivolve = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    // Same turn, the other printed timing: the shared [Once Per Turn] ledger refuses it.
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handAfterDigivolve);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("refuses a second [When Attacking] activation in the same turn and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bastemon" }],
          hand: [
            { card: BEAST, as: "first" },
            { card: BEAST, as: "second" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bastemon");
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    const handAfterFirst = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handAfterFirst).toHaveLength(1);

    await attackWindow(s, "bastemon");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handAfterFirst);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await attackWindow(s, "bastemon");
    await settle(() => s.state.players[0]!.hand.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("resolves printed ＜Alliance＞: the ally suspends, its DP is added and security is checked twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bastemon" },
            { card: NO_TOKEN, as: "ally" },
          ],
          hand: [{ card: NO_TOKEN, as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009"), security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("bastemon"), "Alliance")).toBe(true);
    const attackerPermanentId = s.perm("bastemon").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    const combat = allianceState(s);
    await settle(() => combat.hasOpenAllianceDecision);
    expect(
      s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId } as never),
    ).toEqual({ ok: true });

    // ＜Security A. +1＞: both security cards are checked in the one attack (comprehensive §16-24-1).
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("ally").isSuspended).toBe(true);
    // 7000 + the ally's 3000 beats both 3000 DP security Digimon, so the attacker survives.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerPermanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("opens no ＜Alliance＞ window for a Digimon that does not carry the keyword", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NO_TOKEN, as: "plain", dp: 20_000 },
            { card: NO_TOKEN, as: "ally" },
          ],
          hand: [{ card: NO_TOKEN, as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009"), security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Alliance")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    // One security check only, and the ally was never asked to suspend.
    expect(allianceState(s).hasOpenAllianceDecision).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("passes inherited ＜Alliance＞ up the stack without passing the free-play window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "bastemon" }] },
            // Same top card, nothing underneath: the keyword must come from the stack.
            { card: "BT1-014", as: "bareHost" },
          ],
          hand: [{ card: BEAST, as: "bearmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("bastemon").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bareHost"), "Alliance")).toBe(false);

    // Only ＜Alliance＞ is printed as inherited text; the free play stays with the top card.
    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bearmon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("does not grant the [When Attacking] window to an unrelated Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bastemon" },
            { card: NO_TOKEN, as: "bystander" },
          ],
          hand: [{ card: BEAST, as: "bearmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "bystander");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bearmon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("reaches the battle area and fires both windows through a public digivolve-then-attack route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "bastemon" },
            { card: BEAST, as: "bearmon" },
            { card: NO_TOKEN, as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: NO_TOKEN, as: "target", dp: 1000, suspended: true }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("bastemon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    // Cost 3 and a free Bearmon: memory moved only by the digivolution cost.
    expect(s.state.memory).toBe(3);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("bearmon").instanceId),
    ).toBe(true);
    expect(s.state.phase).toBe(Phase.Main);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    // Printed ＜Alliance＞ opens its own window on every attack; decline it here so this route
    // proves the free-play windows rather than the keyword.
    const combat = allianceState(s);
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" } as never)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // 7000 DP beats the 1000 DP defender; the shared use was already spent on the digivolve, so
    // the attack window played nothing more.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
