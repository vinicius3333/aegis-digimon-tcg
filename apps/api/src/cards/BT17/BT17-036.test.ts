import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-036.js";
import "../BT11/BT11-088.js";
import "../BT18/BT18-040.js";
import "../ST10/ST10-14.js";

describe("BT17-036 Boutmon", () => {
  it("matches the catalog printed text, evolution costs and alternate requirement", () => {
    const definition = getCardDefinition("BT17-036")!;
    expect(definition).toMatchObject({
      nameEn: "Boutmon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Beastkin", "Abadin Electronics"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
    });
    const printed = definition.effectText!.replace(/ /g, " ");
    expect(printed).toContain("[Digivolve]Lv.4 w/[Pulsemon] in its text: Cost 3");
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When this Digimon would leave the battle area by an opponent's effect, by trashing the top card of your security stack, prevent it.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When a card is trashed from your security stack by an effect, this Digimon with [Leon Alexander] in its digivolution cards may digivolve into a Digimon card with [Pulsemon] in its text in the hand without paying the cost.",
    );
    expect(definition.inheritedEffectText!.replace(/ /g, " ")).toBe(
      "[End of Attack] [Once Per Turn] If this Digimon has [Pulsemon] in its text, by trashing the top card of your security stack, unsuspend this Digimon.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("once per turn prevents opponent-effect removal by trashing security", () => {
    expect(
      compiled.effects.find((entry) => entry.frequency === "OncePerTurn" && entry.actions[0]?.kind === "Replacement"),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
  });

  it("evolves into a Pulsemon-text Digimon after effect-removing a security card when Leon is underneath", () => {
    expect(compiled.effects.find((entry) => entry.actions[0]?.kind === "SubTrigger")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenEffectTrashesFromSecurity",
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            },
          ],
        },
      ],
    });
  });

  it("may trash security to unsuspend after attacking when its top card has Pulsemon in its text", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          condition: { kind: "selfTopHasText" },
          cost: { kind: "trashSecurityTop" },
          optional: true,
        },
      ],
    });
  });

  it("digivolves from a Lv4 Pulsemon-text source for 3 through the alternate route and draws one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-043", as: "runnermon" }],
          hand: [{ card: "BT17-036", as: "boutmon" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const runnermonId = s.inst("runnermon").instanceId;
    const boutmonId = s.inst("boutmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("runnermon").permanentId,
        instanceId: boutmonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("runnermon").topCard.instanceId === boutmonId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("runnermon").stack.map((card) => card.instanceId)).toEqual([runnermonId]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-036")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("digivolves from a plain Yellow Lv4 through the printed Lv4 route for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "reppamon" }],
        hand: [{ card: "BT17-036", as: "boutmon" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const boutmonId = s.inst("boutmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("reppamon").permanentId,
        instanceId: boutmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reppamon").topCard.instanceId === boutmonId);

    expect(s.state.memory).toBe(1);
  });

  it("refuses the alternate route from a source that lacks Pulsemon in its text or the level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "offColor" },
          { card: "BT7-032", as: "wrongLevel" },
        ],
        hand: [
          { card: "BT17-036", as: "boutmonA" },
          { card: "BT17-036", as: "boutmonB" },
        ],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("offColor").permanentId,
        instanceId: s.inst("boutmonA").instanceId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongLevel").permanentId,
        instanceId: s.inst("boutmonB").instanceId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("offColor").topCard.cardId).toBe("BT1-014");
    expect(s.perm("wrongLevel").topCard.cardId).toBe("BT7-032");
    expect(s.state.memory).toBe(5);
  });

  it("trashes its top security card to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "boutmon" }],
          security: [
            { card: "BT1-012", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const boutmonId = s.perm("boutmon").permanentId;

    await advance(s.engine).verb.deletePermanent([boutmonId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === boutmonId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("prevents only once per turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "boutmon" }],
          security: [
            { card: "BT1-012", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-014", as: "sec3" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const boutmonId = s.perm("boutmon").permanentId;

    await advance(s.engine).verb.deletePermanent([boutmonId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === boutmonId)).toBe(true);

    await advance(s.engine).verb.deletePermanent([boutmonId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === boutmonId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-036")).toBe(true);
  });

  it("prevents again on a later opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "boutmon" }],
          security: [
            { card: "BT1-012", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const boutmonId = s.perm("boutmon").permanentId;

    await advance(s.engine).verb.deletePermanent([boutmonId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 1);

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    await advance(s.engine).verb.deletePermanent([boutmonId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === boutmonId)).toBe(true);
  });

  it("digivolves for free into a Pulsemon-text Digimon when an effect trashes its security with Leon underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-036", under: ["BT17-086"], as: "boutmon" },
            { card: "BT18-040", as: "attacker" },
          ],
          hand: [{ card: "BT16-047", as: "pulsemonText" }],
          security: [{ card: "BT1-012", as: "sec1" }],
        },
        1: { battleArea: [{ card: "BT1-009", suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT16-047");

    expect(s.perm("boutmon").topCard.cardId).toBe("BT16-047");
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-047")).toBe(false);
  });

  it("does not free-digivolve when a security card is trashed but no Leon is underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", under: ["BT7-032"], as: "boutmon" }],
          hand: [{ card: "BT16-047", as: "pulsemonText" }],
          security: [
            { card: "BT1-012", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle();

    expect(s.perm("boutmon").topCard.cardId).toBe("BT17-036");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-047")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("unsuspends the attacker at end of attack by trashing security when its top card has Pulsemon in text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-047", under: ["BT17-036"], as: "attacker" }],
          security: [{ card: "BT1-012", as: "sec1" }],
        },
        1: { battleArea: [{ card: "BT1-009", suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    const attacker = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === attackerId);
    expect(attacker?.isSuspended).not.toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not unsuspend when Pulsemon is only on an underneath card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", under: ["BT17-036"], dp: 20_000, as: "attacker" }],
          security: [{ card: "BT1-012", as: "sec1" }],
        },
        1: { battleArea: [{ card: "BT1-010", suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    const attacker = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === attackerId);
    expect(attacker?.isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(memoryBefore);
  });
});

async function opponentUsesChaosDegradationOnBoutmon(s: EngineSetup): Promise<void> {
  const optionId = s.inst("chaosDegradation").instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseOption");
  const topOrBottom = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: topOrBottom.decisionId,
      response: { kind: "chooseOption", optionIndex: 0 },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
}

const OPPONENT_REMOVALS = {
  trash: (s: EngineSetup) => advance(s.engine).verb.deletePermanent([s.perm("boutmon").permanentId], "byEffect"),
  hand: (s: EngineSetup) => advance(s.engine).verb.returnToHand([s.perm("boutmon").topCard.instanceId]),
  deck: (s: EngineSetup) => advance(s.engine).verb.returnToDeck([s.perm("boutmon").topCard.instanceId]),
  security: opponentUsesChaosDegradationOnBoutmon,
  digivolutionCardsOnly: (s: EngineSetup) => {
    const boutmon = s.perm("boutmon");
    return advance(s.engine).verb.trashDigivolutionCards(boutmon.permanentId, [boutmon.stack[0]!.instanceId], 1);
  },
} satisfies Record<string, (s: EngineSetup) => Promise<unknown>>;

async function opponentEffectHitsBoutmon(removal: keyof typeof OPPONENT_REMOVALS): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT17-036", under: ["BT7-032"], as: "boutmon" }],
        security: [
          { card: "BT1-012", as: "topSecurity" },
          { card: "BT1-013", as: "bottomSecurity" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-045", as: "yellowHost" },
          { card: "BT2-067", as: "purpleHost" },
        ],
        hand: [{ card: "ST10-14", as: "chaosDegradation" }],
        deck: ["BT1-009", "BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.turnSeat = 1;
  s.state.phase = Phase.Main;
  s.state.memory = 10;
  await s.ready();

  await OPPONENT_REMOVALS[removal](s);
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks();
  return s;
}

async function opponentBagramonPlacesBoutmonUnderAnotherDigimon(): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT17-036", under: ["BT7-032"], as: "boutmon" },
          { card: "BT1-009", as: "otherDigimon" },
        ],
        security: [
          { card: "BT1-012", as: "topSecurity" },
          { card: "BT1-013", as: "bottomSecurity" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT11-088", as: "bagramon" }], deck: ["BT1-009", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoOrderTriggers: true },
  );
  s.state.turnSeat = 1;
  s.state.phase = Phase.Main;
  await s.ready();

  void advance(s.engine).fire(EffectTiming.OnPlay, s.perm("bagramon"));
  for (const alias of ["boutmon", "otherDigimon"]) {
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const choice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm(alias).permanentId] },
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks();
  return s;
}

describe("BT17-036 Boutmon — KB Q&A rulings", () => {
  it("treats trashing, returning to hand or deck, placing in security, and placing under another card as leaving the battle area (Q2786)", async () => {
    for (const removal of ["trash", "hand", "deck", "security"] as const) {
      const s = await opponentEffectHitsBoutmon(removal);
      const boutmonStillInPlay = s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT17-036",
      );
      expect({ removal, boutmonStillInPlay }).toEqual({ removal, boutmonStillInPlay: true });
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
        s.inst("bottomSecurity").instanceId,
      ]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    }

    const placedUnder = await opponentBagramonPlacesBoutmonUnderAnotherDigimon();
    expect(placedUnder.perm("boutmon").topCard.cardId).toBe("BT17-036");
    expect(placedUnder.perm("otherDigimon").stack).toHaveLength(0);
    expect(placedUnder.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      placedUnder.inst("bottomSecurity").instanceId,
    ]);

    // Near-miss: trashing only its digivolution cards does not make Boutmon leave the battle area.
    const control = await opponentEffectHitsBoutmon("digivolutionCardsOnly");
    expect(control.perm("boutmon").topCard.cardId).toBe("BT17-036");
    expect(control.perm("boutmon").stack).toHaveLength(0);
    expect(control.state.players[0]!.security).toHaveLength(2);
  });
});
