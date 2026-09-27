import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const choices = [{ payer: -1, target: -1 }, ...[0, 1].flatMap((payer) => [0, 1].map((target) => ({ payer, target })))];

describe("Monarchlizamon paid De-Digivolve through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["digivolve", "attack"].flatMap((entry) => choices.map((choice) => ({ seat, entry, ...choice }))),
    ),
  )("seat=$seat entry=$entry payer=$payer target=$target", async ({ seat, entry, payer, target }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: entry === "digivolve" ? "BT25-035" : "BT25-057", as: "source" },
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
        hand: entry === "digivolve" ? [{ card: "BT25-057", as: "evolution" }] : [],
        deck: [
          { card: "EX9-046", as: "draw" },
          { card: "EX9-048", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [
          ...[0, 1].map((index) => ({
            card: "EX9-055",
            as: `target-${index}`,
            suspended: true,
            under: [
              { card: "EX9-046", as: `rookie-${index}` },
              { card: "EX9-048", as: `champion-${index}` },
            ],
          })),
          { card: "ST23-13", as: "opposing-tamer", suspended: true, under: [{ card: "ST23-06", faceUp: false }] },
        ],
        breeding: { card: "EX9-048", as: "breeding", under: ["EX9-005"] },
        security: [{ card: "EX9-046", as: "security" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const sourceId = setup.perm("source").permanentId;
    const sourceCards =
      entry === "digivolve"
        ? [setup.inst("source").instanceId, setup.inst("evolution").instanceId]
        : [setup.inst("source").instanceId];
    const targetIds = [0, 1].map((index) => setup.perm(`target-${index}`).permanentId);
    const payerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
    const payments: TrainingWindow[] = [];
    const targets: TrainingWindow[] = [];
    const optionals: TrainingWindow[] = [];
    let declaration = entry;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) =>
          declaration === "digivolve"
            ? intent.type === "digivolve" &&
              intent.instanceId === setup.inst("evolution").instanceId &&
              intent.permanentId === sourceId &&
              intent.alternateRequirementIndex === 2
            : intent.type === "attack" &&
              intent.attackerPermanentId === sourceId &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === targetIds[0],
        );
      if (window.kind === "orderTriggers") return 0;
      expect(window.request?.sourceCardId).toBe("BT25-057");
      if (window.kind === "optional") {
        optionals.push(window);
        return window.request?.promptText === "Battle" || payer < 0 ? 1 : 0;
      }
      const isPayment =
        window.actions.some((action) => payerIds.includes(action.sourceId ?? "")) ||
        window.selected.some((id) => payerIds.includes(id));
      (isPayment ? payments : targets).push(window);
      return window.actions.findIndex((action) =>
        window.selected.length > 0
          ? action.label === "Finish selection"
          : action.sourceId === (isPayment ? payerIds[payer] : targetIds[target]),
      );
    });
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
    expect(optionals.filter((window) => !(window.request?.promptText === "Battle"))).toHaveLength(
      payer < 0 && entry === "digivolve" ? 2 : 1,
    );
    expect(optionals.filter((window) => window.request?.promptText === "Battle")).toHaveLength(
      entry === "digivolve" ? 1 : 0,
    );
    expect(payments).toHaveLength(payer < 0 ? 0 : 2);
    expect(targets).toHaveLength(payer < 0 ? 0 : 2);
    expect(payments[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : payerIds);
    expect(targets[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : targetIds);
    for (const index of [0, 1])
      expect(setup.perm(`tamer-${index}`).stack.map((card) => card.instanceId)).toEqual(
        [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
          (alias) => setup.inst(alias).instanceId,
        ),
      );
    const winsBattle = target === 0;
    expect(setup.state.players[seat]!.battleArea.some((unit) => unit.permanentId === sourceId)).toBe(winsBattle);
    const survivingSource = setup.state.players[seat]!.battleArea.find((unit) => unit.permanentId === sourceId);
    expect(survivingSource?.topCard.instanceId).toBe(winsBattle ? sourceCards.at(-1) : undefined);
    expect(survivingSource?.stack.map((card) => card.instanceId)).toEqual(
      winsBattle ? sourceCards.slice(0, -1) : undefined,
    );
    expect(survivingSource?.isSuspended).toBe(winsBattle ? true : undefined);
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [...(payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId]), ...(winsBattle ? [] : sourceCards)].sort(),
    );
    const enemyTrash = [
      ...(payer < 0 ? [] : [setup.inst(`target-${target}`).instanceId]),
      ...(winsBattle ? [setup.inst("champion-0").instanceId, setup.inst("rookie-0").instanceId] : []),
    ];
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId).sort()).toEqual(enemyTrash.sort());
    for (const index of [0, 1]) {
      const unit = setup.state.players[opponent]!.battleArea.find((item) => item.permanentId === targetIds[index]);
      expect(unit?.topCard.instanceId).toBe(
        index === 0 && winsBattle
          ? undefined
          : setup.inst(target === index ? `champion-${index}` : `target-${index}`).instanceId,
      );
      expect(unit?.stack.map((card) => card.instanceId)).toEqual(
        index === 0 && winsBattle
          ? undefined
          : [`rookie-${index}`, ...(target === index ? [] : [`champion-${index}`])].map(
              (alias) => setup.inst(alias).instanceId,
            ),
      );
    }
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
      entry === "digivolve" ? [setup.inst("draw").instanceId] : [],
    );
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
      [...(entry === "digivolve" ? [] : ["draw"]), "tail"].map((alias) => setup.inst(alias).instanceId),
    );
    expect(setup.state.memory).toBe(entry === "digivolve" ? 7 : 10);
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual([
      setup.inst("security").instanceId,
    ]);
    expect(setup.perm("ineligible").stack).toHaveLength(1);
    expect(setup.perm("opposing-tamer").stack).toHaveLength(1);
    expect(setup.perm("breeding").topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    expect(setup.engine.combat.isAttacking).toBe(false);
    expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(
      setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityRevealed"),
    ).toEqual([]);
  });
});
