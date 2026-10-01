import { EffectTiming, getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT16/BT16-008.js";
import "../BT16/BT16-053.js";
import "../BT18/BT18-026.js";
import "../BT18/BT18-058.js";
import "../BT2/BT2-105.js";
import "../ST20/ST20-04.js";
import "../ST20/ST20-11.js";
import "./BT5-009.js";
import "./BT5-019.js";
import "./BT5-104.js";

describe("BT5-019 Shoutmon DX", () => {
  it("places a red Digimon under itself and deletes once per named source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }],
          hand: [{ card: "BT5-014", as: "placed" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000 },
            { card: "BT1-011", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("shoutmon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Blitz")).toBe(true);
  });

  it("does not delete a 5001-DP Digimon and counts only matching stack names", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "safe", dp: 5001 },
            { card: "BT1-011", as: "boundary", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("safe").permanentId);
  });

  it("deletes one 5000-DP Digimon for each matching source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014", "BT5-017"], as: "shoutmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-011", as: "second", dp: 5000 },
            { card: "BT1-012", as: "third", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("third").permanentId);
  });

  it("continues the scaled deletion when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014", "BT5-017"], as: "shoutmon" }],
          hand: [{ card: "BT10-112", as: "redLevel7" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-011", as: "second", dp: 5000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const beforeStack = s.perm("shoutmon").stack.map(({ instanceId }) => instanceId);
    const beforeHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).toEqual(beforeStack);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(beforeHand);
  });

  it.each(["BT1-010", "BT10-112"])("places a red level %s card exactly on top", async (placedCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }],
          hand: [
            { card: placedCard, as: "placed" },
            { card: "AD1-010", as: "blue" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));

    expect(s.perm("shoutmon").stack.map(({ cardId }) => cardId)).toEqual(["BT5-014", placedCard]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["AD1-010"]);
  });
});

const DECK_FILLER = ["BT5-012", "BT5-012", "BT5-012", "BT5-012"];

function digivolveIntoShoutmonDX(s: ReturnType<typeof setupEngine>) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("shoutmon").permanentId,
    instanceId: s.inst("shoutmonDX").instanceId,
  });
}

async function shoutmonDXAfterOpponentDeDigivolves(deDigivolveOption: "BT2-105" | "BT5-104") {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT18-026", as: "shoutmon", under: ["BT18-058", "BT16-053"] }],
        hand: [
          { card: "BT5-019", as: "shoutmonDX" },
          { card: "BT1-009", as: "levelThree" },
        ],
        deck: DECK_FILLER,
      },
      1: {
        battleArea: ["BT18-058"],
        hand: [{ card: deDigivolveOption, as: "option" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 4;

  expect(digivolveIntoShoutmonDX(s)).toEqual({ ok: true });
  await settle(() => s.perm("shoutmon").stack.at(-1)?.instanceId === s.inst("levelThree").instanceId);
  await settle(() => s.state.pendingDecision === undefined);
  expect(s.perm("shoutmon").topCard.cardId).toBe("BT5-019");

  s.state.turnSeat = 1;
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("shoutmon").topCard.cardId !== "BT5-019");
  await settle(() => s.state.pendingDecision === undefined);
  await s.engine.recomputeContinuousEffects();
  return s;
}

describe("BT5-019 Shoutmon DX — KB Q&A rulings", () => {
  it("lets Shoutmon's reveal add two ShoutmonDX copies, one as the Shoutmon-named card and one as the Blitz card (Q1289)", async () => {
    const shoutmonDX = getCardDefinition("BT5-019")!;
    expect(shoutmonDX.nameEn).toContain("Shoutmon");
    expect(shoutmonDX.effectText).toContain("＜Blitz＞");

    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-009", as: "revealer" }],
          deck: [
            { card: "BT5-019", as: "firstCopy" },
            { card: "BT5-019", as: "secondCopy" },
            "BT5-008",
            "BT5-011",
            "BT5-012",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 3);
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("firstCopy").instanceId, s.inst("secondCopy").instanceId].sort(),
    );
    expect(player.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT5-008", "BT5-011", "BT5-012"]);
  });

  it("may place a red level 4 or lower or a red level 7 Digimon card from hand when digivolving from level 5 (Q1295)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-014", as: "shoutmon", under: ["BT5-009"] }],
          hand: [
            { card: "BT5-019", as: "shoutmonDX" },
            { card: "BT5-011", as: "levelFour" },
            { card: "BT10-112", as: "levelSeven" },
            { card: "AD1-010", as: "blue" },
          ],
          deck: DECK_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("levelSeven").instanceId);
    s.state.memory = 4;

    expect(digivolveIntoShoutmonDX(s)).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").stack.at(-1)?.instanceId === s.inst("levelSeven").instanceId);

    const placement = s.decisions.find(
      ({ req }) =>
        (req.kind === "selectCards" || req.kind === "chooseTargets") &&
        (req.options?.candidateInstanceIds ?? []).includes(s.inst("levelSeven").instanceId),
    );
    expect(placement?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("levelFour").instanceId, s.inst("levelSeven").instanceId]),
    );
    expect(placement?.req.options?.candidateInstanceIds).not.toContain(s.inst("blue").instanceId);
    expect(s.perm("shoutmon").stack.map(({ cardId }) => cardId)).toEqual(["BT5-009", "BT5-014", "BT10-112"]);
  });

  it("becomes the placed level 3 Digimon after De-Digivolve 1, keeping the cards below and their inherited effects (Q1296)", async () => {
    const s = await shoutmonDXAfterOpponentDeDigivolves("BT2-105");
    const shoutmon = s.perm("shoutmon");

    expect(shoutmon.topCard.instanceId).toBe(s.inst("levelThree").instanceId);
    expect(getCardDefinition(shoutmon.topCard.cardId)?.level).toBe(3);
    expect(shoutmon.stack.map(({ cardId }) => cardId)).toEqual(["BT18-058", "BT16-053", "BT18-026"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT5-019"]);
    for (const inheritedSource of ["BT18-058", "BT16-053", "BT18-026"]) {
      expect(observe(s.engine).canUseInheritedEffect(shoutmon, inheritedSource)).toBe(true);
    }
    expect(shoutmon.currentDP).toBe(3000 + 1000 + 1000 + 2000);
  });

  it("stops De-Digivolve 2 after trashing ShoutmonDX once the placed level 3 card is on top (Q1297)", async () => {
    const s = await shoutmonDXAfterOpponentDeDigivolves("BT5-104");
    const shoutmon = s.perm("shoutmon");

    const declaredAmount = s.decisions.find(({ seat, req }) => seat === 1 && req.kind === "chooseOption");
    expect(declaredAmount?.req.options?.choices).toEqual(["2 cards", "1 card"]);

    expect(shoutmon.topCard.instanceId).toBe(s.inst("levelThree").instanceId);
    expect(shoutmon.stack.map(({ cardId }) => cardId)).toEqual(["BT18-058", "BT16-053", "BT18-026"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT5-019"]);
    expect(observe(s.engine).canUseInheritedEffect(shoutmon, "BT18-026")).toBe(true);
    expect(shoutmon.currentDP).toBe(3000 + 1000 + 1000 + 2000);
  });

  it("lets the player choose the order of its simultaneous [When Digivolving] effects (Q1298)", async () => {
    const blitzThenPlaceKeys = ["BT5-019/ir-7-0", "BT5-019/ir-7-1"];
    for (const chosenIndex of [0, 1]) {
      const outcome = await orderShoutmonDXWhenDigivolvingEffects(chosenIndex);

      expect(outcome.triggerCardIds).toEqual(["BT5-019", "BT5-019"]);
      expect(outcome.triggerDescriptions?.[0]).toContain("＜Blitz＞");
      expect(outcome.triggerDescriptions?.[1]).toContain("You may place 1 red Digimon card");
      outcome.triggerKeys.forEach((key, index) => expect(key.endsWith(blitzThenPlaceKeys[index]!)).toBe(true));
      expect(outcome.resolvedEffectKeys).toEqual(
        chosenIndex === 0 ? blitzThenPlaceKeys : [...blitzThenPlaceKeys].reverse(),
      );
    }
  });

  it("resolves the other [When Digivolving] effect after [When Attacking] effects and before Counter Timing when Blitz goes first (Q1299)", async () => {
    const preferInstanceIds: string[] = [];
    let suspendedBeforeDeletion: boolean | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-014", as: "shoutmon", under: ["BT16-008"] }],
          hand: [
            { card: "BT5-019", as: "shoutmonDX" },
            { card: "BT5-011", as: "placed" },
          ],
          deck: DECK_FILLER,
        },
        1: {
          battleArea: [
            { card: "ST20-04", as: "garudamon" },
            { card: "BT1-010", as: "small", dp: 5000 },
          ],
          hand: [{ card: "ST20-11", as: "counter" }],
          security: ["BT5-012", "BT5-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        // "ir-7-0" is the key suffix of ShoutmonDX's first printed [When Digivolving] effect, <Blitz>.
        preferTriggerKeys: ["BT5-019/ir-7-0"],
        onEvent: () => {
          if (suspendedBeforeDeletion !== undefined) return;
          const smallStillInPlay = s.state.players[1]!.battleArea.some(
            ({ topCard }) => topCard.instanceId === s.inst("small").instanceId,
          );
          if (!smallStillInPlay) suspendedBeforeDeletion = s.perm("garudamon").isSuspended;
        },
      },
    );
    preferInstanceIds.push(s.perm("garudamon").topCard.instanceId);
    s.state.memory = 3;

    expect(digivolveIntoShoutmonDX(s)).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("shoutmon").permanentId));
    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("placed").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.combat.hasOpenCounterWindow);

    expect(s.engine.combat.isAttacking).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("shoutmon").stack.at(-1)?.instanceId).toBe(s.inst("placed").instanceId);
    expect(s.perm("garudamon").isSuspended).toBe(true);
    expect(suspendedBeforeDeletion).toBe(true);
  });
});

async function orderShoutmonDXWhenDigivolvingEffects(chosenIndex: number) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT5-014", as: "shoutmon", under: ["BT5-009"] }],
        hand: [
          { card: "BT5-019", as: "shoutmonDX" },
          { card: "BT5-011", as: "placed" },
        ],
        deck: DECK_FILLER,
      },
    },
    // An activated Blitz attacks before the other effect resolves (Q1299); this ordering
    // check only needs both effects to resolve, so the attack is declined.
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false, declinePrompts: ["Activate Blitz?"] },
  );
  s.state.memory = 3;

  expect(digivolveIntoShoutmonDX(s)).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const order = s.decisions.find(({ req }) => req.kind === "orderTriggers")!;
  expect(order.seat).toBe(0);
  const triggerKeys = order.req.options?.triggerKeys ?? [];
  expect(triggerKeys).toHaveLength(2);

  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "orderTriggers", order: [triggerKeys[chosenIndex]!] },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("shoutmon").stack.at(-1)?.instanceId === s.inst("placed").instanceId &&
      s.decisions.some(({ req }) => req.promptText.includes("Blitz")),
  );

  return {
    triggerKeys,
    triggerCardIds: order.req.options?.triggerCardIds,
    triggerDescriptions: order.req.options?.triggerDescriptions,
    resolvedEffectKeys: s.events.flatMap((event) =>
      event.kind === "effectResolved" && event.sourceCardId === "BT5-019" ? [event.effectKey] : [],
    ),
  };
}
