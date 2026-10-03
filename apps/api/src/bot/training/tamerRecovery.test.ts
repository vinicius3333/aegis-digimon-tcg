import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Murasamemon recovery payment through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["digivolve", "attack"].flatMap((entry) => [-1, 0, 1].map((payer) => ({ seat, entry, payer }))),
    ),
  )("seat=$seat entry=$entry payer=$payer", async ({ seat, entry, payer }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: entry === "digivolve" ? "BT26-026" : "BT26-031", as: "source" },
          ...[0, 1].map((index) => ({
            card: "ST23-13",
            as: `tamer-${index}`,
            suspended: true,
            under: [
              { card: "ST23-06", as: `visible-${index}`, faceUp: true },
              { card: "BT25-032", as: `bottom-${index}`, faceUp: false },
              { card: "BT26-025", as: `next-${index}`, faceUp: false },
            ],
          })),
          { card: "ST23-13", as: "ineligible", suspended: true, under: [{ card: "ST23-06", faceUp: true }] },
        ],
        hand: entry === "digivolve" ? [{ card: "BT26-031", as: "evolution" }] : [],
        deck: [
          ...(entry === "digivolve" ? [{ card: "EX9-046", as: "draw" }] : []),
          { card: "EX9-047", as: "recovery" },
          { card: "EX9-048", as: "tail" },
        ],
        security: [{ card: "EX9-046", as: "own-security" }],
      },
      [opponent]: {
        battleArea: [
          { card: "EX9-048", as: "defender", suspended: true },
          { card: "ST23-13", as: "opposing-tamer", suspended: true, under: [{ card: "ST23-06", faceUp: false }] },
        ],
        security: [{ card: "EX9-046", as: "opposing-security" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const sourceId = setup.perm("source").permanentId;
    const defenderId = setup.perm("defender").permanentId;
    const payerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
    const paymentWindows: TrainingWindow[] = [];
    const optionalWindows: TrainingWindow[] = [];
    let declaration = entry;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) =>
          declaration === "digivolve"
            ? intent.type === "digivolve" &&
              intent.instanceId === setup.inst("evolution").instanceId &&
              intent.permanentId === sourceId &&
              intent.alternateRequirementIndex === 0
            : intent.type === "attack" &&
              intent.attackerPermanentId === sourceId &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === defenderId,
        );
      if (window.kind === "orderTriggers") return 0;
      if (window.kind === "optional") {
        expect(window.request?.sourceCardId).toBe("BT26-031");
        optionalWindows.push(window);
        return payer < 0 ? 1 : 0;
      }
      if (window.actions.some((action) => action.sourceId === "mine"))
        return window.actions.findIndex((action) => action.label === "Finish selection");
      expect(window.request?.sourceCardId).toBe("BT26-031");
      paymentWindows.push(window);
      return window.actions.findIndex((action) =>
        payer < 0 || window.selected.length > 0
          ? action.label === "Finish selection"
          : action.sourceId === payerIds[payer],
      );
    });
    // A paid evolution activation must prevent another recovery on the same turn's attack.
    for (const next of entry === "digivolve" ? ["digivolve", "attack"] : ["attack"]) {
      declaration = next;
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 20; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      expect(mainActionReady(setup.engine)).toBe(true);
    }
    const offers = paymentWindows.filter((window) => window.selected.length === 0);
    expect(optionalWindows).toHaveLength(payer < 0 && entry === "digivolve" ? 2 : 1);
    expect(offers).toHaveLength(payer < 0 ? 0 : 1);
    for (const offer of offers) expect(offer.actions.map((action) => action.sourceId)).toEqual(payerIds);
    expect(paymentWindows.filter((window) => window.selected.length > 0)).toHaveLength(payer < 0 ? 0 : 1);
    for (const index of [0, 1])
      expect(setup.perm(`tamer-${index}`).stack.map((card) => card.instanceId)).toEqual(
        [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
          (alias) => setup.inst(alias).instanceId,
        ),
      );
    expect(setup.perm("ineligible").stack).toHaveLength(1);
    expect(setup.perm("opposing-tamer").stack).toHaveLength(1);
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(
      payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId],
    );
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual(
      [...(payer < 0 ? [] : ["recovery"]), "own-security"].map((alias) => setup.inst(alias).instanceId),
    );
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
      [...(payer < 0 ? ["recovery"] : []), "tail"].map((alias) => setup.inst(alias).instanceId),
    );
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
      entry === "digivolve" ? [setup.inst("draw").instanceId] : [],
    );
    expect(setup.perm("source").topCard.cardId).toBe("BT26-031");
    expect(setup.perm("source").stack.map((card) => card.instanceId)).toEqual(
      entry === "digivolve" ? [setup.inst("source").instanceId] : [],
    );
    expect(setup.perm("source").isSuspended).toBe(true);
    expect(setup.state.memory).toBe(entry === "digivolve" ? 7 : 10);
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
      setup.inst("defender").instanceId,
    ]);
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual([
      setup.inst("opposing-security").instanceId,
    ]);
    expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(
      setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityRevealed"),
    ).toEqual([]);
    expect(setup.state.pendingDecision).toBeUndefined();
    const recoveryKey = optionalWindows[0]!.request!.options!.effectKey;
    expect(recoveryKey).toBeDefined();
    const recoveryActivations = setup.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === "BT26-031" && event.effectKey === recoveryKey,
    );
    // An offered payment is still verified above; declining it does not announce an activation.
    expect(recoveryActivations).toHaveLength(payer < 0 ? 0 : 1);
    if (payer >= 0)
      expect(recoveryActivations[0]).toMatchObject({
        timing: entry === "digivolve" ? "WhenDigivolving" : "OnUseAttack",
      });
  });
});
