import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

async function answerUntilComplete(
  setup: ReturnType<typeof setupEngine>,
  policy: ReturnType<typeof createAsyncTrainingPolicy>,
): Promise<void> {
  for (let step = 0; step < 24; step++) {
    await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
    const pending = setup.state.pendingDecision;
    if (pending === undefined) break;
    const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual({
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
  it.each([...paths, { payment: [] as readonly number[], evolution: -1, batch: false }])(
    "pays $payment (batch=$batch) and chooses evolution $evolution",
    async ({ payment, evolution, batch }) => {
      const setup = setupEngine(
        {
          0: {
            battleArea: [
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
            deck: [{ card: "EX9-046", as: "draw" }],
          },
          1: {
            battleArea: [
              { card: "EX9-054", as: "target-0" },
              { card: "EX9-055", as: "target-1" },
            ],
          },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.memory = 10;
      await setup.ready();
      const windows: TrainingWindow[] = [];
      let paid = 0;
      const tamerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
      const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
        windows.push(window);
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("played").instanceId,
          );
        if (window.kind === "optional") {
          const evolved = setup.state.players[0]!.battleArea.some(
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
        const wanted = evolution < 0 ? undefined : setup.inst(`evolution-${evolution}`).instanceId;
        const candidate = window.actions.findIndex((action) => action.sourceId === wanted);
        if (candidate >= 0) {
          for (const index of [0, 1])
            expect(
              window.actions.some((action) => action.sourceId === setup.inst(`evolution-${index}`).instanceId),
            ).toBe(true);
        }
        return candidate < 0 ? 0 : candidate;
      });
      expect(setup.engine.applyIntent(0, await policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({
        ok: true,
      });
      await answerUntilComplete(setup, policy);
      expect(paid).toBe(payment.length);
      expect(setup.state.memory).toBe(10 - getCardDefinition("BT25-035")!.playCost);
      for (const host of [0, 1]) {
        const spent = payment.filter((selected) => selected === host).length;
        expect(setup.perm(`tamer-${host}`).stack.map((card) => card.instanceId)).toEqual([
          setup.inst(`visible-${host}`).instanceId,
          ...[0, 1].slice(spent).map((index) => setup.inst(`cost-${host}-${index}`).instanceId),
        ]);
        for (let index = 0; index < spent; index++) {
          expect(setup.state.players[0]!.trash).toContainEqual(
            expect.objectContaining({ instanceId: setup.inst(`cost-${host}-${index}`).instanceId, faceUp: true }),
          );
        }
      }
      const played = setup.state.players[0]!.battleArea.find(
        (unit) =>
          unit.topCard.instanceId === setup.inst("played").instanceId ||
          unit.stack.some((card) => card.instanceId === setup.inst("played").instanceId),
      )!;
      expect(played.topCard.instanceId).toBe(
        setup.inst(evolution < 0 ? "played" : `evolution-${evolution}`).instanceId,
      );
      expect(setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("draw").instanceId)).toBe(
        evolution >= 0,
      );
      expect(windows.some((window) => window.kind === "optional")).toBe(true);
    },
  );
});

describe("scoped nested payment and mode choices through the async adapter", () => {
  it.each([
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, -1],
  ])("selects payment %i and play/use mode %i", async (payment, mode) => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "host" },
            {
              card: "ST23-13",
              as: "tamer-0",
              suspended: true,
              under: [{ card: "ST23-06", as: "cost-0", faceUp: false }],
            },
            {
              card: "ST23-13",
              as: "tamer-1",
              suspended: true,
              under: [{ card: "ST23-12", as: "cost-1", faceUp: false }],
            },
          ],
          hand: [
            { card: "BT25-041", as: "evolution" },
            { card: "BT26-089", as: "played" },
            "ST23-12",
            { card: "BT26-031", as: "option" },
            "BT25-057",
          ],
          deck: ["EX9-046"],
          security: [{ card: "BT25-032", as: "security-cost" }],
        },
        1: {
          battleArea: [
            { card: "EX9-055", as: "target-0", dp: 20000 },
            { card: "EX9-055", as: "target-1", dp: 20000 },
          ],
        },
      },
      { autoOrderTriggers: false, autoOrderCards: false },
    );
    setup.state.memory = 10;
    await setup.ready();
    const selectedCardId = setup.inst(mode === 0 ? "played" : "option").instanceId;
    const modalWindows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) =>
            intent.type === "digivolve" &&
            intent.instanceId === setup.inst("evolution").instanceId &&
            intent.alternateRequirementIndex === 0,
        );
      if (window.kind === "optional") return 1;
      if (window.kind === "chooseOption") {
        modalWindows.push(window);
        expect(window.actions.some((action) => action.label === "Add your top security card")).toBe(true);
        return payment < 0 ? window.actions.length - 1 : payment;
      }
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      const wanted = [setup.inst("tamer-1").instanceId, selectedCardId, setup.perm("target-1").permanentId];
      const choice = window.actions.findIndex((action) => wanted.includes(action.sourceId ?? ""));
      if (choice < 0) throw new Error(`Unexpected nested choice: ${JSON.stringify(window.actions)}`);
      return choice;
    });
    expect(setup.engine.applyIntent(0, await policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({
      ok: true,
    });
    await answerUntilComplete(setup, policy);
    expect(setup.perm("host").topCard.instanceId).toBe(setup.inst("evolution").instanceId);
    expect(modalWindows).toHaveLength(1);
    expect(setup.state.players[0]!.security).toHaveLength(payment === 0 ? 0 : 1);
    expect(
      setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("security-cost").instanceId),
    ).toBe(payment === 0);
    expect(setup.perm("tamer-0").stack).toHaveLength(1);
    expect(setup.perm("tamer-1").stack).toHaveLength(payment === 1 ? 0 : 1);
    if (payment === 1)
      expect(setup.state.players[0]!.trash).toContainEqual(
        expect.objectContaining({ instanceId: setup.inst("cost-1").instanceId, faceUp: true }),
      );
    expect(
      setup.state.players[0]!.battleArea.some((unit) => unit.topCard.instanceId === setup.inst("played").instanceId),
    ).toBe(mode === 0);
    expect(setup.state.players[0]!.trash.some((card) => card.instanceId === setup.inst("option").instanceId)).toBe(
      mode === 1,
    );
    expect(setup.perm("target-0").currentDP).toBe(20000);
    expect(setup.perm("target-1").currentDP).toBe(mode === 1 ? 12000 : 20000);
    const extraCost = mode < 0 ? 0 : Math.max(0, getCardDefinition(mode === 0 ? "BT26-089" : "BT26-031")!.playCost - 3);
    expect(setup.state.memory).toBe(7 - extraCost);
  });
});
