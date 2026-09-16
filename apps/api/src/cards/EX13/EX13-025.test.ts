import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-025.js";
import "../index.js";

const CARD_ID = "EX13-025";

const WITCHELNY_TYPE_CARD = "BT18-036";
const WITCHELNY_TEXT_ONLY_CARD = "BT19-029";
const NON_WITCHELNY_CARD = "BT9-035";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const AUTOMATION = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-025 Candlemon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Candlemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Flame"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      effectText:
        "[Start of Your Main Phase] If you have 3 or more security cards, trash your top or bottom security card, ＜Draw 1＞ and gain 1 memory. Then, if you have 2 or fewer security cards, you may place 1 card with [Witchelny] in its text from your hand as the bottom security card.\n[Rule] Trait: Has [Witchelny] Type.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon with [Dynasmon] or [Witchelny] in its text would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.digivolutionRequirement).toBeUndefined();

    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 3 },
          ifTrue: [
            { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1, chooseTopOrBottom: true },
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              amount: 1,
              optional: true,
              source: {
                filter: {
                  controller: "mine",
                  zone: "hand",
                  nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
                },
                count: 1,
              },
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[0]?.frequency).toBeUndefined();

    expect(compiled.effects[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Witchelny"] }],
    });

    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            printedTextOnly: true,
            nameOrTrait: [{ tokens: ["Dynasmon", "Witchelny"], match: "text" }],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
  });

  it("trashes one end of a 3-card stack, draws, gains memory, then places a [Witchelny] text card at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [
            { card: WITCHELNY_TYPE_CARD, as: "witchelny" },
            { card: NON_WITCHELNY_CARD, as: "spare" },
          ],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "middle" },
            { card: "BT1-012", as: "bottom" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014", INERT],
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("middle").instanceId,
      s.inst("bottom").instanceId,
      s.inst("witchelny").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).not.toBe(true);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the BOTTOM security card when the controller picks that end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [{ card: WITCHELNY_TYPE_CARD, as: "witchelny" }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "middle" },
            { card: "BT1-012", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("middle").instanceId,
      s.inst("witchelny").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the [Witchelny] card in hand when the printed “may” is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [{ card: WITCHELNY_TYPE_CARD, as: "witchelny" }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "middle" },
            { card: "BT1-012", as: "bottom" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014", INERT],
        },
        1: { security: [INERT], deck: DECK },
      },
      { autoDeclineOptional: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle(() => s.state.memory === 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("middle").instanceId,
      s.inst("bottom").instanceId,
    ]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("witchelny").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts a card that names [Witchelny] only in its printed TEXT, and refuses one that never does", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [
            { card: WITCHELNY_TEXT_ONLY_CARD, as: "textOnly" },
            { card: NON_WITCHELNY_CARD, as: "nonMatch" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 0;
    await s.ready();
    expect(getCardDefinition(WITCHELNY_TEXT_ONLY_CARD)?.types).not.toContain("Witchelny");

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(securityIds[securityIds.length - 1]).toBe(s.inst("textOnly").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing at all below the printed 3-security gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [{ card: WITCHELNY_TYPE_CARD, as: "witchelny" }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("bottom").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("witchelny").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("runs the first sentence but skips the placement while the post-trash stack is still 3 or more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [{ card: WITCHELNY_TYPE_CARD, as: "witchelny" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("candlemon"));
    await settle(() => s.state.memory === 1);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("witchelny").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires from a real turn transition into the controller's own Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "candlemon" }],
          hand: [{ card: WITCHELNY_TYPE_CARD, as: "witchelny" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.security.length === 3);

    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(securityIds[securityIds.length - 1]).toBe(s.inst("witchelny").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
  });

  it("grants the [Witchelny] trait through its printed [Rule] clause", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "candlemon" }], security: [INERT], deck: DECK },
      1: { security: [INERT], deck: DECK },
    });
    await s.ready();

    expect(getCardDefinition(CARD_ID)?.types).toEqual(["Flame"]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("candlemon"), "Flame")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("candlemon"), "Witchelny")).toBe(true);
  });

  it("keeps a [Witchelny]-text host on the board by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TYPE_CARD, as: "host", under: [CARD_ID] }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
  });

  it("does not protect a host without [Dynasmon] or [Witchelny] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NON_WITCHELNY_CARD, as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-010", as: "top" }],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("does not answer the controller's OWN effect, and cannot pay with an empty security stack", async () => {
    const ownEffect = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TYPE_CARD, as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-010", as: "top" }],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await ownEffect.ready();
    const ownHostId = ownEffect.perm("host").permanentId;

    advance(ownEffect.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(ownEffect.engine).verb.deletePermanent([ownHostId], "byEffect")).toBe(1);
    advance(ownEffect.engine).verb.leaveEffectResolution();
    await settle(() => ownEffect.state.pendingDecision === undefined);

    expect(ownEffect.state.players[0]!.battleArea).toHaveLength(0);
    expect(ownEffect.state.players[0]!.security).toHaveLength(1);

    const noSecurity = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TYPE_CARD, as: "host", under: [CARD_ID] }],
          security: [],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await noSecurity.ready();
    const hostId = noSecurity.perm("host").permanentId;

    advance(noSecurity.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(noSecurity.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(noSecurity.engine).verb.leaveEffectResolution();
    await settle(() => noSecurity.state.pendingDecision === undefined);

    expect(noSecurity.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("prevents only one departure per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TYPE_CARD, as: "host", under: [CARD_ID] }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(2);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);

    const revived = s.putOnBoard(0, { card: WITCHELNY_TYPE_CARD, as: "host2", under: [CARD_ID] });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([revived.permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(revived.permanentId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
