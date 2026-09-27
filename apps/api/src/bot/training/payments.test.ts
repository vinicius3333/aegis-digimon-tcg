import { describe, expect, it } from "vitest";
import { getCardDefinition, type Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

async function answerUntilComplete(
  setup: ReturnType<typeof setupEngine>,
  policy: ReturnType<typeof createAsyncTrainingPolicy>,
  seat: Seat = 0,
): Promise<void> {
  for (let step = 0; step < 24; step++) {
    await settle(
      () =>
        setup.state.pendingDecision !== undefined ||
        setup.engine.combat.barrierDecisionPermanentId !== undefined ||
        mainActionReady(setup.engine),
    );
    const barrierId = setup.engine.combat.barrierDecisionPermanentId;
    if (barrierId !== undefined) {
      expect(
        setup.engine.applyIntent(seat, await policy.chooseBarrierResponse(buildBotView(setup.state, seat)!, barrierId)),
      ).toEqual({ ok: true });
      continue;
    }
    const pending = setup.state.pendingDecision;
    if (pending === undefined) break;
    const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(
      setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
    ).toEqual({
      ok: true,
    });
    await settle();
  }
  await settle(() => mainActionReady(setup.engine));
  expect(mainActionReady(setup.engine)).toBe(true);
  expect(setup.state.pendingDecision).toBeUndefined();
  expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
}

const payments = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
] as const;
const paths = payments.flatMap((payment) =>
  [0, 1].flatMap((evolution) =>
    (payment[0] === payment[1] ? [false] : [false, true]).map((batch) => ({ payment, evolution, batch })),
  ),
);

describe("scoped repeated payments through the async training adapter", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      (["play", "evolve"] as const).flatMap((entry) =>
        [0, 1].flatMap((target) =>
          [...paths, { payment: [] as readonly number[], evolution: -1, batch: false }].map((path) => ({
            ...path,
            seat,
            entry,
            target,
          })),
        ),
      ),
    ),
  )(
    "seat $seat $entry targets $target, pays $payment (batch=$batch), evolves $evolution",
    async ({ payment, evolution, batch, seat, entry, target }) => {
      const setup = setupEngine(
        {
          [seat]: {
            battleArea: [
              ...(entry === "evolve" ? [{ card: "BT25-032", as: "host" }] : []),
              {
                card: "ST23-13",
                as: "tamer-0",
                suspended: true,
                under: [
                  { card: "ST23-06", as: "visible-0", faceUp: true },
                  { card: "BT25-032", as: "cost-0-0", faceUp: false },
                  { card: "BT26-025", as: "cost-0-1", faceUp: false },
                ],
              },
              {
                card: "ST23-13",
                as: "tamer-1",
                suspended: true,
                under: [
                  { card: "ST23-12", as: "visible-1", faceUp: true },
                  { card: "BT25-032", as: "cost-1-0", faceUp: false },
                  { card: "BT26-025", as: "cost-1-1", faceUp: false },
                ],
              },
            ],
            hand: [
              { card: "BT25-035", as: "played" },
              { card: "ST23-04", as: "evolution-0" },
              { card: "BT25-041", as: "evolution-1" },
            ],
            deck: [
              { card: "EX9-046", as: "draw-0" },
              { card: "EX9-047", as: "draw-1" },
              { card: "EX9-048", as: "draw-2" },
            ],
          },
          [1 - seat]: {
            battleArea: [
              { card: "EX9-054", as: "target-0", dp: 20000 },
              { card: "EX9-055", as: "target-1", dp: 20000 },
            ],
          },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const windows: TrainingWindow[] = [];
      let paid = 0;
      let targetChoices = 0;
      const tamerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        windows.push(window);
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) =>
              "instanceId" in intent &&
              intent.instanceId === setup.inst("played").instanceId &&
              (entry === "play"
                ? intent.type === "playCard"
                : intent.type === "digivolve" && intent.alternateRequirementIndex === 0),
          );
        if (window.kind === "optional") {
          const evolved = setup.state.players[seat]!.battleArea.some(
            (unit) => unit.topCard.instanceId === setup.inst(`evolution-${Math.max(evolution, 0)}`).instanceId,
          );
          return evolution < 0 || evolved ? 1 : 0;
        }
        if (window.selected.length && (!batch || paid === payment.length || !tamerIds.includes(window.selected[0]!)))
          return window.actions.findIndex((action) => action.label === "Finish selection");
        if (window.actions.some((action) => tamerIds.includes(action.sourceId ?? ""))) {
          expect(
            window.actions
              .filter((action) => tamerIds.includes(action.sourceId ?? ""))
              .map((action) => action.sourceId),
          ).toEqual(tamerIds.filter((id) => !window.selected.includes(id)));
          const host = payment[paid++];
          return window.actions.findIndex((action) => action.sourceId === tamerIds[host!]);
        }
        const targetIds = [0, 1].map((index) => setup.perm(`target-${index}`).permanentId);
        if (window.actions.some((action) => targetIds.includes(action.sourceId ?? ""))) {
          targetChoices++;
          expect(
            window.actions.filter((action) => action.sourceId !== undefined).map((action) => action.sourceId),
          ).toEqual(targetIds);
          return window.actions.findIndex((action) => action.sourceId === targetIds[target]);
        }
        const wanted = evolution < 0 ? undefined : setup.inst(`evolution-${evolution}`).instanceId;
        const candidate = window.actions.findIndex((action) => action.sourceId === wanted);
        if (candidate >= 0) {
          for (const index of [0, 1])
            expect(
              window.actions.some((action) => action.sourceId === setup.inst(`evolution-${index}`).instanceId),
            ).toBe(true);
        }
        if (candidate < 0) throw new Error(`Unexpected payment choice: ${JSON.stringify(window.actions)}`);
        return candidate;
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      await answerUntilComplete(setup, policy, seat);
      expect(paid).toBe(payment.length);
      expect(targetChoices).toBe(evolution === 0 ? 2 : 1);
      expect(setup.state.players[seat]!.trash).toHaveLength(payment.length);
      expect(setup.state.memory).toBe(10 - (entry === "play" ? getCardDefinition("BT25-035")!.playCost : 2));
      for (const host of [0, 1]) {
        const spent = payment.filter((selected) => selected === host).length;
        expect(setup.perm(`tamer-${host}`).stack.map((card) => card.instanceId)).toEqual([
          setup.inst(`visible-${host}`).instanceId,
          ...[0, 1].slice(spent).map((index) => setup.inst(`cost-${host}-${index}`).instanceId),
        ]);
        for (let index = 0; index < spent; index++) {
          expect(setup.state.players[seat]!.trash).toContainEqual(
            expect.objectContaining({ instanceId: setup.inst(`cost-${host}-${index}`).instanceId, faceUp: true }),
          );
        }
      }
      const played = setup.state.players[seat]!.battleArea.find(
        (unit) =>
          unit.topCard.instanceId === setup.inst("played").instanceId ||
          unit.stack.some((card) => card.instanceId === setup.inst("played").instanceId),
      )!;
      expect(played.topCard.instanceId).toBe(
        setup.inst(evolution < 0 ? "played" : `evolution-${evolution}`).instanceId,
      );
      expect(played.stack.map((card) => card.instanceId)).toEqual([
        ...(entry === "evolve" ? [setup.inst("host").instanceId] : []),
        ...(evolution >= 0 ? [setup.inst("played").instanceId] : []),
      ]);
      const draws = (entry === "evolve" ? 1 : 0) + (evolution >= 0 ? 1 : 0);
      const drawnIds = [0, 1, 2].slice(0, draws).map((index) => setup.inst(`draw-${index}`).instanceId);
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
        ...[0, 1].filter((index) => index !== evolution).map((index) => setup.inst(`evolution-${index}`).instanceId),
        ...drawnIds,
      ]);
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
        [0, 1, 2].slice(draws).map((index) => setup.inst(`draw-${index}`).instanceId),
      );
      for (const index of [0, 1]) {
        const unit = setup.perm(`target-${index}`);
        expect(unit.currentDP).toBe(20000 - (index === target ? 3000 + (evolution === 0 ? 5000 : 0) : 0));
      }
      expect(windows.some((window) => window.kind === "optional")).toBe(true);
    },
  );
});

describe("scoped nested payment and mode choices through the async adapter", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      (["evolve", "attack"] as const).flatMap((entry) =>
        [0, 1].flatMap((target) =>
          [...[0, 1, 2].flatMap((payment) => [0, 1].map((mode) => ({ payment, mode }))), { payment: -1, mode: -1 }].map(
            (path) => ({ ...path, seat, entry, target }),
          ),
        ),
      ),
    ),
  )(
    "seat=$seat entry=$entry payment=$payment mode=$mode target=$target",
    async ({ payment, mode, seat, entry, target }) => {
      const setup = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: entry === "evolve" ? "BT26-026" : "BT25-041", as: "host", dp: 30000 },
              {
                card: "ST23-13",
                as: "tamer-0",
                suspended: true,
                under: [
                  { card: "ST23-06", as: "visible-0", faceUp: true },
                  { card: "BT25-032", as: "cost-0", faceUp: false },
                  { card: "BT26-025", as: "next-0", faceUp: false },
                ],
              },
              {
                card: "ST23-13",
                as: "tamer-1",
                suspended: true,
                under: [
                  { card: "ST23-12", as: "visible-1", faceUp: true },
                  { card: "BT25-032", as: "cost-1", faceUp: false },
                  { card: "BT26-025", as: "next-1", faceUp: false },
                ],
              },
            ],
            hand: [
              ...(entry === "evolve" ? [{ card: "BT25-041", as: "evolution" }] : []),
              { card: "BT26-089", as: "played" },
              { card: "ST23-12", as: "unselected-0" },
              { card: "BT26-031", as: "option" },
              { card: "BT25-057", as: "unselected-1" },
            ],
            deck: [
              { card: "EX9-046", as: "draw" },
              { card: "EX9-047", as: "tail" },
            ],
            security: [{ card: "BT25-032", as: "security-cost" }],
          },
          [1 - seat]: {
            battleArea: [
              { card: "EX9-055", as: "target-0", dp: 20000, suspended: true },
              { card: "EX9-055", as: "target-1", dp: 20000, suspended: true },
            ],
          },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const targets = [setup.perm("target-0"), setup.perm("target-1")];
      const host = setup.perm("host");
      const selectedCardId = setup.inst(mode === 0 ? "played" : "option").instanceId;
      const modalWindows: TrainingWindow[] = [];
      let followUpAttack = false;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) =>
            entry === "evolve" && !followUpAttack
              ? intent.type === "digivolve" &&
                intent.instanceId === setup.inst("evolution").instanceId &&
                intent.alternateRequirementIndex === 0
              : intent.type === "attack" &&
                intent.attackerPermanentId === host.permanentId &&
                intent.target.kind === "permanent" &&
                intent.target.permanentId === targets[0]!.permanentId,
          );
        if (window.kind === "optional" || window.kind === "respondBarrier") return 1;
        if (window.kind === "orderTriggers") return 0;
        if (window.kind === "chooseOption") {
          modalWindows.push(window);
          expect(window.actions).toHaveLength(3);
          expect(window.actions.slice(0, 2).map((action) => action.label)).toEqual([
            "Add your top security card",
            "Trash a bottom face-down Tamer card",
          ]);
          return payment < 0 ? window.actions.length - 1 : payment === 0 ? 0 : 1;
        }
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        const wanted = [
          setup.inst(`tamer-${Math.max(0, payment - 1)}`).instanceId,
          selectedCardId,
          targets[target]!.permanentId,
        ];
        const choice = window.actions.findIndex((action) => wanted.includes(action.sourceId ?? ""));
        if (choice < 0) throw new Error(`Unexpected nested choice: ${JSON.stringify(window.actions)}`);
        return choice;
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      await answerUntilComplete(setup, policy, seat);
      expect(host.topCard.instanceId).toBe(setup.inst(entry === "evolve" ? "evolution" : "host").instanceId);
      expect(host.stack.map((item) => item.instanceId)).toEqual(
        entry === "evolve" ? [setup.inst("host").instanceId] : [],
      );
      expect(host.isSuspended).toBe(entry === "attack");
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        ...(mode === 0 ? [] : [setup.inst("played").instanceId]),
        setup.inst("unselected-0").instanceId,
        ...(mode === 1 ? [] : [setup.inst("option").instanceId]),
        setup.inst("unselected-1").instanceId,
        ...(entry === "evolve" ? [setup.inst("draw").instanceId] : []),
        ...(payment === 0 ? [setup.inst("security-cost").instanceId] : []),
      ]);

      expect(modalWindows).toHaveLength(1);
      expect(setup.state.players[seat]!.security).toHaveLength(payment === 0 ? 0 : 1);
      expect(
        setup.state.players[seat]!.hand.some((card) => card.instanceId === setup.inst("security-cost").instanceId),
      ).toBe(payment === 0);
      for (const index of [0, 1]) {
        expect(setup.perm(`tamer-${index}`).stack.map((item) => item.instanceId)).toEqual(
          [`visible-${index}`, ...(payment === index + 1 ? [] : [`cost-${index}`]), `next-${index}`].map(
            (alias) => setup.inst(alias).instanceId,
          ),
        );
      }
      expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual([
        ...(payment > 0 ? [setup.inst(`cost-${payment - 1}`).instanceId] : []),
        ...(mode === 1 ? [setup.inst("option").instanceId] : []),
      ]);
      expect(
        setup.state.players[seat]!.battleArea.some(
          (unit) => unit.topCard.instanceId === setup.inst("played").instanceId,
        ),
      ).toBe(mode === 0);
      expect(setup.state.players[seat]!.trash.some((card) => card.instanceId === setup.inst("option").instanceId)).toBe(
        mode === 1,
      );
      for (const index of [0, 1])
        expect(targets[index]!.currentDP).toBe(mode === 1 && target === index ? 12000 : 20000);
      expect(setup.state.players[1 - seat]!.trash.map((item) => item.instanceId)).toEqual(
        entry === "attack" ? [setup.inst("target-0").instanceId] : [],
      );
      expect(setup.state.players[1 - seat]!.battleArea.map((unit) => unit.permanentId)).toEqual(
        targets.slice(entry === "attack" ? 1 : 0).map((unit) => unit.permanentId),
      );
      expect(setup.state.players[seat]!.hand.some((item) => item.instanceId === setup.inst("draw").instanceId)).toBe(
        entry === "evolve",
      );
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
        (entry === "evolve" ? ["tail"] : ["draw", "tail"]).map((alias) => setup.inst(alias).instanceId),
      );
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.events.filter((event) => event.kind === "securityChecked")).toEqual([]);
      const extraCost =
        mode < 0 ? 0 : Math.max(0, getCardDefinition(mode === 0 ? "BT26-089" : "BT26-031")!.playCost - 3);
      expect(setup.state.memory).toBe(10 - (entry === "evolve" ? 3 : 0) - extraCost);
      if (entry === "evolve") {
        followUpAttack = true;
        const memoryBeforeAttack = setup.state.memory;
        const trashBeforeAttack = setup.state.players[seat]!.trash.map((item) => item.instanceId);
        expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual(
          { ok: true },
        );
        await answerUntilComplete(setup, policy, seat);
        expect(modalWindows).toHaveLength(payment < 0 ? 2 : 1);
        expect(setup.state.memory).toBe(memoryBeforeAttack);
        expect(setup.state.players[seat]!.trash.map((item) => item.instanceId).sort()).toEqual(
          [...trashBeforeAttack, setup.inst("host").instanceId, setup.inst("evolution").instanceId].sort(),
        );
        expect(setup.state.players[seat]!.battleArea.some((unit) => unit.permanentId === host.permanentId)).toBe(false);
        expect(setup.engine.combat.isAttacking).toBe(false);
      }
    },
  );
});
