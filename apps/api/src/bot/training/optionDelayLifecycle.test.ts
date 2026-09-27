import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady, mainActions } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const paths = ([0, 1] as const)
  .flatMap((seat) => [
    { seat, card: "LM-033", host: -1, evolution: -1 },
    ...[
      [-1, -1],
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ].map(([host, evolution]) => ({
      seat,
      card: "LM-054",
      host: host!,
      evolution: evolution!,
    })),
  ])
  .flatMap((entry) => [false, true].map((security) => ({ ...entry, security })));

describe("placed Options become usable through the policy on a later turn", () => {
  it.each(paths)(
    "seat=$seat card=$card host=$host evolution=$evolution security=$security",
    async ({ seat, card, host, evolution, security }) => {
      const opponent = seat === 0 ? 1 : 0;
      const revealCards = card === "LM-033" ? ["BT6-090", "LM-031", "BT25-032"] : ["BT25-020", "EX8-074"];
      const setup = setupEngine(
        {
          [seat]: {
            ...(security ? { security: [{ card, as: "option" }] } : {}),
            hand: [
              ...(!security ? [{ card, as: "option" }] : []),
              { card: "EX9-047", as: "evolve-0" },
              { card: "EX9-048", as: "evolve-1" },
            ],
            battleArea: [
              { card: "EX9-046", as: "host-0" },
              { card: "EX9-046", as: "host-1" },
            ],
            deck: [
              ...revealCards.map((id, index) => ({ card: id, as: `reveal-${index}` })),
              { card: "EX9-046", as: "turn-draw" },
              { card: "EX9-046", as: "evolution-draw" },
            ],
          },
          [opponent]: {
            hand: ["EX9-046"],
            deck: ["EX9-046", "EX9-046", "EX9-046"],
            battleArea: [{ card: "EX9-046", as: "attacker" }],
          },
        },
        { autoOrderCards: false, autoOrderTriggers: false },
      );
      setup.state.turnSeat = security ? opponent : seat;
      setup.state.memory = 10;
      setup.state.isFirstPlayersFirstTurn = true;
      await setup.ready();
      const optionId = setup.inst("option").instanceId;
      const hosts = [setup.perm("host-0"), setup.perm("host-1")];
      const bases = hosts.map((unit) => unit.topCard.instanceId);
      const evolutions = [setup.inst("evolve-0").instanceId, setup.inst("evolve-1").instanceId];
      const windows: TrainingWindow[] = [];
      let mainChoice: "playCard" | "activateEffect" | "endPhase" = "playCard";
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        windows.push(window);
        if (window.kind === "main") return window.actions.findIndex(({ intent }) => intent.type === mainChoice);
        if (window.kind === "block") return window.actions.findIndex(({ intent }) => intent.type === "declineBlock");
        if (window.kind === "orderCards") return 0;
        if (window.kind === "optional") return host < 0 ? 1 : 0;
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex(
          (action) => action.sourceId === hosts[host]?.permanentId || action.sourceId === evolutions[evolution],
        );
      });
      let opponentChoice: "attack" | "endPhase" = security ? "attack" : "endPhase";
      const opponentPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) =>
        window.actions.findIndex(
          ({ intent }) =>
            intent.type === opponentChoice && (intent.type !== "attack" || intent.target.kind === "player"),
        ),
      );
      async function chooseOpponentMain(): Promise<void> {
        expect(
          setup.engine.applyIntent(
            opponent,
            await opponentPolicy.chooseMainAction(buildBotView(setup.state, opponent)!),
          ),
        ).toEqual({ ok: true });
      }
      async function chooseMain(): Promise<void> {
        expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual(
          {
            ok: true,
          },
        );
      }
      async function resolveChoices(): Promise<void> {
        let answeredBlock = false;
        for (let step = 0; step < 20; step++) {
          await settle();
          const block = setup.events.find((event) => event.kind === "blockWindowOpened");
          if (block?.kind === "blockWindowOpened" && !answeredBlock && setup.engine.combat.isAttacking) {
            answeredBlock = true;
            const result = setup.engine.applyIntent(
              seat,
              await policy.chooseBlockResponse(buildBotView(setup.state, seat)!, {
                ...block,
                mustBlock: block.mustBlock ?? false,
                targetsPlayer: true,
              }),
            );
            expect(result).toEqual({ ok: true });
            continue;
          }
          const pending = setup.state.pendingDecision;
          if (!pending) {
            if (mainActionReady(setup.engine)) break;
            continue;
          }
          const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
          const result = setup.engine.applyIntent(
            seat,
            await policy.answerDecision(buildBotView(setup.state, seat), request),
          );
          expect(result).toEqual({ ok: true });
        }
        await settle(() => mainActionReady(setup.engine));
        expect(mainActionReady(setup.engine)).toBe(true);
        expect(setup.state.pendingDecision).toBeUndefined();
      }
      const loop = setup.engine.startTurnLoop();
      try {
        await advance(setup.engine).waitForMainPhase(security ? opponent : seat);
        if (security) await chooseOpponentMain();
        else await chooseMain();
        await resolveChoices();
        const placed = setup.state.players[seat]!.battleArea.find((unit) => unit.topCard.instanceId === optionId)!;
        expect(placed).toBeDefined();
        const entryTurn = placed.enterFieldTurnCount;
        expect(entryTurn).toBe(setup.state.turnCount);
        const activation = () =>
          mainActions(setup.engine, seat).filter(
            ({ intent }) => intent.type === "activateEffect" && intent.sourceInstanceId === optionId,
          );
        expect(activation()).toEqual([]);
        mainChoice = "endPhase";
        if (!security) {
          await chooseMain();
          await advance(setup.engine).waitForMainPhase(opponent);
        }
        opponentChoice = "endPhase";
        await chooseOpponentMain();
        await advance(setup.engine).waitForMainPhase(seat);
        expect(setup.state.turnCount).toBeGreaterThan(entryTurn);
        expect(activation()).toHaveLength(1);
        const memoryBefore = setup.state.memory;
        windows.length = 0;
        mainChoice = "activateEffect";
        await chooseMain();
        await resolveChoices();
        const evolved = card === "LM-054" && host >= 0;
        const initialRevealIds = revealCards.map((_, index) => setup.inst(`reveal-${index}`).instanceId);
        const tailIds = [setup.inst("turn-draw").instanceId, setup.inst("evolution-draw").instanceId];
        const deckBeforeDraw =
          security && card === "LM-033" ? [...initialRevealIds, ...tailIds] : [...tailIds, ...initialRevealIds];
        expect(setup.state.players[seat]!.trash.map((instance) => instance.instanceId)).toEqual([optionId]);
        expect(activation()).toEqual([]);
        expect(setup.state.memory).toBe(memoryBefore + (card === "LM-033" ? 2 : evolved && evolution === 0 ? -1 : 0));
        expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
          bases.map((id, index) => (evolved && index === host ? evolutions[evolution] : id)),
        );
        expect(hosts.map((unit) => unit.stack.map((instance) => instance.instanceId))).toEqual(
          bases.map((id, index) => (evolved && index === host ? [id] : [])),
        );
        expect(setup.state.players[seat]!.hand.map((instance) => instance.instanceId)).toEqual([
          ...evolutions.filter((_, index) => !evolved || index !== evolution),
          ...deckBeforeDraw.slice(0, evolved ? 2 : 1),
        ]);
        expect(setup.state.players[seat]!.deck.map((instance) => instance.instanceId)).toEqual(
          deckBeforeDraw.slice(evolved ? 2 : 1),
        );
        expect(setup.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(security ? 1 : 0);
        expect(setup.engine.combat.isAttacking).toBe(false);
        expect(windows.filter((window) => window.kind === "optional")).toHaveLength(card === "LM-054" ? 1 : 0);
        expect(
          windows
            .filter((window) => window.request && window.kind !== "optional" && window.selected.length === 0)
            .map((window) => window.actions.map((action) => action.sourceId)),
        ).toEqual(evolved ? [hosts.map((unit) => unit.permanentId), evolutions] : []);
        expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      } finally {
        if (!setup.state.gameOver) setup.engine.applyIntent(setup.state.turnSeat, { type: "surrender" });
        await loop;
      }
    },
  );
});
