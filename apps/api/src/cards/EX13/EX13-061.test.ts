import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
  Phase,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-061.js";

const CARD_ID = "EX13-061";
const TOKEN_ID = "TOKEN-Hinukamuy-Token";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

async function fireOnPlay(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm(alias));
}

describe("EX13-061 Gankoomon", () => {
  it("matches the catalog identity and every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Gankoomon",
      colors: ["Black", "White"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
    });
    const text = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(text).toContain("[Digivolve] Lv.5 w/[Huckmon] in text: Cost 4");
    expect(text).toContain("[Assembly -5] 3 [Huckmon] text Digimon cards w/different names");
    expect(text).toContain("＜Reboot＞");
    expect(text).toContain("＜Blocker＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] You may play 1 [Hinukamuy] Token. (Digimon/White/6000 DP/＜Alliance＞ ＜Reboot＞ ＜Blocker＞) Then, until your opponent's turn ends, their Digimon effects don't affect 1 of your white Digimon.",
    );
    expect(text).toContain(
      "[All Turns] [Once Per Turn] When any of your white Digimon suspend, you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(CARD_ID)?.securityEffectText ?? "").trim()).toBe("");
    expect(compiled.effects.every((effect) => effect.isInherited !== true)).toBe(true);
    expect(compiled.effects.every((effect) => effect.isSecurity !== true)).toBe(true);
  });

  it("compiles the keyword grants, both token windows, the suspend watcher and both play headers", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }],
    });

    const tokenBody = [
      { kind: "PlayToken", tokens: ["Hinukamuy Token"], count: 1, payCost: false, optional: true },
      {
        kind: "Restrict",
        restriction: "beAffected",
        fromSourceKind: ["Digimon"],
        byOpponentEffectsOnly: true,
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["White"] } },
      },
    ];
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay", actions: tokenBody });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: tokenBody });
    expect(compiled.effects[1]).not.toHaveProperty("frequency");
    expect(compiled.effects[2]).not.toHaveProperty("frequency");
    expect(compiled.effects[1]).not.toHaveProperty("sharedUseKey");
    expect(compiled.effects[2]).not.toHaveProperty("sharedUseKey");
    expect(compiled.effects[1]?.actions[0]).not.toHaveProperty("condition");

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["White"] },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              filter: {
                controller: "mine",
                kind: ["Option"],
                playCostLte: 5,
                nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
              },
              target: { count: 1, source: "thisDigimon" },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[3]?.actions[0]).not.toHaveProperty("sourceFilter.isSelfRef");
    expect(compiled.effects[3]).not.toHaveProperty("sharedUseKey");

    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }]),
    );
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      {
        materials: [
          {
            count: 3,
            kinds: ["Digimon"],
            nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
            differentNames: true,
          },
        ],
        reduceCost: 5,
      },
    ]);
    expect(getCardDefinition(TOKEN_ID)).toMatchObject({
      cardId: TOKEN_ID,
      nameEn: "Hinukamuy Token",
      kinds: ["Digimon"],
      colors: ["White"],
      dp: 6000,
      isToken: true,
    });
  });

  it("digivolves from a black Lv.5 on the printed EvoCost for 5, keeping source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("gankoomon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a red Lv.5 [Huckmon]-text base on the alternate header for 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-08", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("falls back to the printed EvoCost when the alternate header does not match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["BT20-013", "right [Huckmon] token, wrong level (Lv.4)"],
    ["BT1-020", "right level, wrong colour and no [Huckmon] token"],
  ])("refuses %s as a source on both routes (%s)", async (base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gankoomon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
        `${base} alt=${useAlternateCost}`,
      ).toBe(false);
    }
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard.cardId).toBe(base);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gankoomon").instanceId]);
  });

  it("Q7405: an inherited watcher assembled under Gankoomon sees Gankoomon being played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          trash: [
            { card: "ST12-08", as: "first" },
            { card: "ST12-06", as: "second" },
            { card: "EX13-009", as: "third" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID);
      return permanent?.stack.length === 3;
    });
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST12-08", "ST12-06", "EX13-009"]),
    );
    expect(played.stack).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("Q7397: accepts three same-level materials when each has [Huckmon] somewhere in its text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          trash: [
            { card: "ST12-04", as: "first" },
            { card: "BT23-076", as: "second" },
            { card: "BT7-082", as: "third" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    for (const id of ["ST12-04", "BT23-076", "BT7-082"]) {
      expect(getCardDefinition(id)?.level).toBe(3);
    }
    expect((getCardDefinition("BT23-076")?.nameEn ?? "").includes("Huckmon")).toBe(false);
    expect((getCardDefinition("BT23-076")?.effectText ?? "").includes("[Huckmon]")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID);
      return permanent?.stack.length === 3;
    });

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST12-04", "BT23-076", "BT7-082"]),
    );
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it.each([
    ["duplicate names", ["ST12-06", "BT20-013", "ST12-04"]],
    ["a material without the [Huckmon] token", ["ST12-08", "ST12-06", "BT1-009"]],
    ["an Option in place of a Digimon card", ["ST12-08", "ST12-06", "BT6-093"]],
  ])("rejects Assembly with %s", (_why, materials) => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "gankoomon" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        deck: DECK,
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: materials.map((_card, index) => s.inst(`material${index}`).instanceId),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("grants both printed keywords through the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "gankoomon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "Blocker")).toBe(true);
  });

  it("unsuspends during the opponent's unsuspend phase with ＜Reboot＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "gankoomon", suspended: true }], deck: DECK },
      1: { deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("gankoomon").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: DECK },
        1: { battleArea: [{ card: CARD_ID, as: "gankoomon" }], security: ["BT1-011"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("gankoomon").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("gankoomon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
  });

  it("plays the Hinukamuy Token with its printed stat line and keywords on [On Play]", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "gankoomon" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID));
    await settle(() => s.state.pendingDecision === undefined);
    expect(preferred).toEqual([]);

    const token = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === TOKEN_ID)!;
    expect(token.currentDP).toBe(6000);
    expect(token.stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(token, "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(-1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a SECOND token while one is already out: no printed 'if you don't have' gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: TOKEN_ID, as: "existing" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const existingId = s.perm("existing").permanentId;

    await fireOnPlay(s, "gankoomon");
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === TOKEN_ID).length === 2,
    );
    await settle(() => s.state.pendingDecision === undefined);

    const tokenIds = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === TOKEN_ID).map(
      ({ permanentId }) => permanentId,
    );
    expect(tokenIds).toHaveLength(2);
    expect(tokenIds).toContain(existingId);
  });

  it("Q7398-Q7403: chosen white Digimon ignores opponent Digimon effects but remains targetable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gankoomon", dp: 13000 }], deck: DECK },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await fireOnPlay(s, "gankoomon");
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID)).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Option")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Tamer")).toBe(false);

    const permanentId = s.perm("gankoomon").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(14000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(14000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(11000);
  });

  it("Q7399: an opponent Digimon effect can select the immune white Digimon, but doesn't change it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: {
          hand: [{ card: "BT20-033", as: "loader" }],
          deck: DECK,
          security: ["BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);

    preferred.push(s.perm("gankoomon").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("gankoomon").currentDP).toBe(13000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);
  });

  it("refuses a non-white Digimon as the immunity recipient", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("redAlly").topCard.instanceId);
    expect(getCardDefinition("BT1-013")?.colors).toEqual(["Red"]);

    await fireOnPlay(s, "gankoomon");
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon"));

    expect(observe(s.engine).isRestrictedByEffect(s.perm("redAlly"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);
  });

  it("reaches the same window on [When Digivolving] and lets the immunity lapse after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID));
    await settle(() => s.state.pendingDecision === undefined);

    const immune = s.state.players[0]!.battleArea.filter((permanent) =>
      observe(s.engine).isRestrictedByEffect(permanent, "beAffected", "Digimon"),
    );
    expect(immune).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    const immuneId = immune[0]!.permanentId;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    await settle();

    const stillImmune = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === immuneId);
    expect(stillImmune).toBeDefined();
    expect(observe(s.engine).isRestrictedByEffect(stillImmune!, "beAffected", "Digimon")).toBe(false);
  });

  it("uses a cost-1 [Huckmon] Option from hand for free when an allied WHITE Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: TOKEN_ID, as: "whiteAlly" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("whiteAlly").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires when the Black/White host itself suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("still enforces the Option's own colour requirement, which the clause never waives", async () => {
    const red = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gankoomon" }],
          hand: [{ card: "BT6-093", as: "redOption" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await red.ready();
    expect(getCardDefinition("BT6-093")?.colors).toEqual(["Red"]);

    await advance(red.engine).verb.suspend([red.perm("gankoomon").permanentId]);
    await settle();

    expect(red.state.players[0]!.trash).toHaveLength(0);
    expect(red.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([red.inst("redOption").instanceId]);

    const white = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gankoomon" }],
          hand: [{ card: "BT23-099", as: "whiteOption" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    white.state.memory = 3;
    await white.ready();
    expect(getCardDefinition("BT23-099")?.colors).toEqual(["White"]);
    expect(getCardDefinition("BT23-099")?.playCost).toBe(2);

    await advance(white.engine).verb.suspend([white.perm("gankoomon").permanentId]);
    await settle(
      () => !white.state.players[0]!.hand.some(({ instanceId }) => instanceId === white.inst("whiteOption").instanceId),
    );
    await settle();

    expect(white.state.memory).toBe(3);
    expect(white.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      white.inst("whiteOption").instanceId,
    );
  });

  it("does not fire for a NON-white ally, nor for the opponent's white Digimon", async () => {
    const nonWhite = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT6-093", as: "option" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await nonWhite.ready();
    expect(getCardDefinition("BT1-013")?.colors).toEqual(["Red"]);

    await advance(nonWhite.engine).verb.suspend([nonWhite.perm("redAlly").permanentId]);
    await settle();

    expect(nonWhite.state.players[0]!.trash).toHaveLength(0);
    expect(nonWhite.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      nonWhite.inst("option").instanceId,
    ]);

    const opposing = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT6-093", as: "option" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: TOKEN_ID, as: "theirWhite" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await opposing.ready();

    await advance(opposing.engine).verb.suspend([opposing.perm("theirWhite").permanentId]);
    await settle();

    expect(opposing.state.players[0]!.trash).toHaveLength(0);
    expect(opposing.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      opposing.inst("option").instanceId,
    ]);
  });

  it("Q7404: removes the used Option from Gankoomon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon", under: [{ card: "BT6-093", as: "stackOption" }] },
            { card: "BT10-064", as: "neighbour", under: [{ card: "BT6-093", as: "foreignOption" }] },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("gankoomon").stack).toHaveLength(0);
    expect(s.perm("neighbour").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("foreignOption").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("stackOption").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("never reaches a neighbour's digivolution cards when nothing else qualifies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT10-064", as: "neighbour", under: [{ card: "BT6-093", as: "foreignOption" }] },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("neighbour").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("foreignOption").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("ignores a non-[Huckmon] Option and an over-cap [Huckmon] Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT1-091", as: "noToken" },
            { card: "ST12-16", as: "overCap" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();
    expect(getCardDefinition("BT1-091")?.colors).toEqual(["Red"]);
    expect(getCardDefinition("ST12-16")?.colors).toEqual(["Black"]);
    expect(getCardDefinition("ST12-16")?.playCost).toBe(7);
    expect((getCardDefinition("ST12-16")?.effectText ?? "").includes("[Huckmon]")).toBe(true);
    expect((getCardDefinition("BT1-091")?.effectText ?? "").includes("Huckmon")).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("noToken").instanceId,
      s.inst("overCap").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declines the window, leaving the Option in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("option").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("fires the watcher once per turn and reopens it on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "first" },
            { card: "BT6-093", as: "second" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("gankoomon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => false, 60);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("gankoomon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT6-093").length === 2);

    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT6-093")).toHaveLength(2);
  });
});
