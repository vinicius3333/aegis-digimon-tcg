import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-070.js";
import { answerOrder, answerRemainingOrdersUntil, offeredTriggers } from "./simultaneousTriggers.testSupport.js";
import "../index.js";

describe("EX12-070 Sanmyojin Arrival", () => {
  it("maps Use Req, the mandatory TB cost, full leave trigger, Delay activation, and Security", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["TB"], match: "trait" }] } },
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && effect.keywords === undefined);
    expect(main?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 2,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["TB"], match: "trait" }] }, count: 1 },
        },
        abortOnDecline: true,
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const arm = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(arm?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false }],
    });
    expect(arm?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
    expect(registeredCompiledCards.get("EX12-070")).toEqual(compiled);
    expect(compiledEffects["EX12-070"]).toEqual(compiled);
  });

  it("trashes a TB card before drawing and placing itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-009", as: "tb" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
          ],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(true);

    // Self-placement is this Option's final routing, so it carries the marker the trash
    // route carries. Without it the client's resolving-Option dock never learns the card
    // is done and holds the screen until its failsafe ceiling.
    const optionId = s.inst("option").instanceId;
    expect(
      s.events.some(
        (event) => event.kind === "cardsMoved" && event.optionUsed === true && event.instanceIds.includes(optionId),
      ),
    ).toBe(true);
  });

  it("does not place itself or draw when the TB cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "tb" }],
          hand: [{ card: "EX12-070", as: "option" }],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX12-070"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not draw or place itself when the controller declines the TB cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-009", as: "tb" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
          ],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      {},
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-070"));

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-070")).toBe(false);
  });

  it("activates Main from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX12-070", as: "securityOption", faceUp: true }],
          hand: [{ card: "EX12-063", as: "payment" }],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(true);
  });

  it("arms Delay when a level 5 TB Digimon would leave and consumes it to play Sanmyojin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "victim" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
            { card: "EX12-065", as: "sanmyojin" },
          ],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070"));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX12-070",
    )!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-065"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-065")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-070")).toBe(true);
  });

  it("keeps a Delay played this turn out of the simultaneous-trigger prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-063", as: "victim" },
            { card: "EX12-070", as: "established" },
          ],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
            { card: "EX12-065", as: "sanmyojin" },
          ],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX12-070").length === 2,
    );
    const decisionsBefore = s.decisions.length;

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-065"));

    // §16-17-3 bars the copy played this turn, so only the established one reacts: offering both
    // would put an entry in the chooser that the server then refuses.
    expect(
      s.decisions
        .slice(decisionsBefore)
        .some(({ req }) => req.kind === "orderTriggers" && req.options?.triggerCardIds?.includes("EX12-070")),
    ).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-070")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("established").instanceId)).toBe(
      true,
    );
  });

  it("does not consume Delay when a level 4 TB Digimon leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-011", as: "victim" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
            { card: "EX12-065", as: "sanmyojin" },
          ],
          deck: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-070"));
    const optionPermanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "EX12-070")!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-070")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("sanmyojin").instanceId);
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition("EX12-070")).toMatchObject({
      nameEn: "Sanmyojin Arrival",
      colors: ["Yellow", "Green", "Blue"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["Shambala", "TB"],
    });
  });
});

describe("EX12-070 Sanmyojin Arrival — KB Q&A rulings", () => {
  it('does not draw or place itself when no [TB] card can be trashed for the "by" condition (Q6883)', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "tb" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "BT1-009", as: "nonTb" },
          ],
          deck: ["BT1-010", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-070"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonTb").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-070")).toBe(false);
  });

  async function deleteWithEstablishedArrival(victim: { card: string; under?: string[] }, trash: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { ...victim, as: "victim" },
            { card: "EX12-070", as: "arrival" },
          ],
          hand: [{ card: "EX12-065", as: "sanmyojin" }],
          trash,
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    return { s, deletion };
  }

  it("lets the player order its [All Turns] effect, <Evade> and <Decode> (Q6884)", async () => {
    const { s, deletion } = await deleteWithEstablishedArrival({ card: "EX12-036", under: ["EX12-026"] }, []);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const offered = offeredTriggers(s);
    expect(offered.map(({ cardId }) => cardId).sort()).toEqual(["EX12-036", "EX12-036", "EX12-070"]);
    const arrival = offered.find(({ cardId }) => cardId === "EX12-070")!;
    expect(offered.indexOf(arrival)).toBeGreaterThan(0);
    await answerOrder(s, arrival.key);

    let evadeAnswered = false;
    for (let step = 0; step < 20; step += 1) {
      await settle(
        () =>
          s.state.pendingDecision?.kind === "orderTriggers" ||
          (!evadeAnswered && s.events.some(({ kind }) => kind === "evadePrompt")) ||
          s.events.some(({ kind }) => kind === "evadeResolved"),
        200,
      );
      if (!evadeAnswered && s.events.some(({ kind }) => kind === "evadePrompt")) {
        evadeAnswered = true;
        expect(
          s.engine.applyIntent(0, { type: "respondEvade", permanentId: s.perm("victim").permanentId, accept: true }),
        ).toEqual({ ok: true });
        continue;
      }
      if (s.state.pendingDecision?.kind === "orderTriggers") {
        await answerOrder(s, offeredTriggers(s)[0]!.key);
        continue;
      }
      break;
    }
    expect(await deletion).toBe(0);
    await answerRemainingOrdersUntil(s, () => s.state.pendingDecision === undefined);

    const arrivalPlayed = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "EX12-065");
    const decodePlayed = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "EX12-026");
    const evaded = s.events.findIndex(({ kind }) => kind === "evadePrompt");
    expect(arrivalPlayed).toBeGreaterThanOrEqual(0);
    expect(evaded).toBeGreaterThan(arrivalPlayed);
    expect(decodePlayed).toBeGreaterThan(arrivalPlayed);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX12-036", "EX12-065", "EX12-026"]),
    );
  });

  it("lets the player order the deleted Digimon's [On Deletion] and the played Digimon's [On Play] (Q6885)", async () => {
    const { s, deletion } = await deleteWithEstablishedArrival({ card: "EX12-063" }, ["EX12-026", "EX12-009"]);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const offered = offeredTriggers(s);
    expect(offered.map(({ cardId }) => cardId).sort()).toEqual(["EX12-063", "EX12-065"]);
    const onPlay = offered.at(-1)!;
    await answerOrder(s, onPlay.key);
    await answerRemainingOrdersUntil(s, () => s.state.pendingDecision === undefined);
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);

    const resolvedOrder = s.events.flatMap((event) =>
      event.kind === "effectResolved" && ["EX12-063", "EX12-065"].includes(event.sourceCardId)
        ? [event.sourceCardId]
        : [],
    );
    expect(resolvedOrder[0]).toBe(onPlay.cardId);
    expect(new Set(resolvedOrder)).toEqual(new Set(["EX12-063", "EX12-065"]));
  });
});
