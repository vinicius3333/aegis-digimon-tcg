import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Marsmon's separate boost and battle choices through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["play", "digivolve", "attack"].flatMap((entry) =>
        [0, 1].flatMap((boost) => [
          { seat, entry, boost, fighter: -1, target: -1 },
          ...[0, 1].flatMap((fighter) => [0, 1].map((target) => ({ seat, entry, boost, fighter, target }))),
        ]),
      ),
    ),
  )(
    "seat=$seat entry=$entry boost=$boost fighter=$fighter target=$target",
    async ({ seat, entry, boost, fighter, target }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: "EX9-046", as: "ally", dp: 13000 },
            { card: "BT6-090", as: "tamer" },
            ...(entry === "digivolve" ? [{ card: "BT25-057", as: "host" }] : []),
            ...(entry === "attack" ? [{ card: "BT25-020", as: "marsmon" }] : []),
          ],
          breeding: { card: "EX9-046", as: "own-breeding", under: ["EX9-005"] },
          hand: entry === "attack" ? [] : [{ card: "BT25-020", as: "marsmon" }],
          deck: [{ card: "EX9-046", as: "evolution-draw" }],
        },
        [opponent]: {
          battleArea: [
            { card: "EX9-048", as: "target-0", dp: 12000 },
            { card: "EX9-048", as: "target-1", dp: 14000 },
            { card: "BT6-090", as: "other-tamer" },
          ],
          breeding: { card: "EX9-048", as: "other-breeding", under: ["EX9-005"] },
          security: [
            { card: "EX9-046", as: "security-0" },
            { card: "EX9-047", as: "security-1" },
            { card: "EX9-046", as: "security-2" },
          ],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const marsmonId = setup.inst("marsmon").instanceId;
      const hostId = entry === "digivolve" ? setup.perm("host").permanentId : undefined;
      const attackingId = entry === "attack" ? setup.perm("marsmon").permanentId : undefined;
      const ally = setup.perm("ally");
      const targetIds = [setup.perm("target-0").permanentId, setup.perm("target-1").permanentId];
      const targetCardIds = [setup.inst("target-0").instanceId, setup.inst("target-1").instanceId];
      const defenderDP = [12000, 14000];
      const originalSecurity = [0, 1, 2].map((index) => setup.inst(`security-${index}`).instanceId);
      const ownWindows: TrainingWindow[] = [];
      const targetWindows: TrainingWindow[] = [];
      const optionalWindows: TrainingWindow[] = [];
      let ownSelection = 0;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) =>
            entry === "play"
              ? intent.type === "playCard" && intent.instanceId === marsmonId
              : entry === "digivolve"
                ? intent.type === "digivolve" && intent.instanceId === marsmonId && intent.permanentId === hostId
                : intent.type === "attack" &&
                  intent.attackerPermanentId === attackingId &&
                  intent.target.kind === "player",
          );
        if (window.kind === "optional") {
          optionalWindows.push(window);
          return fighter < 0 ? 1 : 0;
        }
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        if (window.actions.some((action) => action.sourceId === ally.permanentId)) {
          ownWindows.push(window);
          const ownIds = [
            ally.permanentId,
            setup.state.players[seat]!.battleArea.find((unit) => unit.topCard.instanceId === marsmonId)!.permanentId,
          ];
          const selected = ownSelection++ === 0 ? boost : fighter;
          return window.actions.findIndex((action) => action.sourceId === ownIds[selected]);
        }
        targetWindows.push(window);
        return window.actions.findIndex((action) => action.sourceId === targetIds[target]);
      });
      const opponentPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
        await Promise.resolve();
        expect(window.kind).toBe("optional");
        return 1;
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 20; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(
          setup.engine.applyIntent(
            request.seat,
            await (request.seat === seat ? policy : opponentPolicy).answerDecision(
              buildBotView(setup.state, request.seat),
              request,
            ),
          ),
        ).toEqual({ ok: true });
        await settle();
      }
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(entry === "attack" ? 1 : 0);
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(optionalWindows).toHaveLength(1);
      const marsmonPermanentId = setup.events.find(
        (event) => event.kind === "cardPlayed" && event.cardId === "BT25-020",
      );
      expect(marsmonPermanentId?.kind).toBe(entry === "play" ? "cardPlayed" : undefined);
      const sourceId =
        entry === "digivolve"
          ? hostId
          : entry === "attack"
            ? attackingId
            : marsmonPermanentId?.kind === "cardPlayed"
              ? marsmonPermanentId.permanentId
              : undefined;
      expect(ownWindows[0]!.request?.options?.timing).toBe(
        entry === "play" ? "OnPlay" : entry === "digivolve" ? "WhenDigivolving" : "WhenAttacking",
      );
      const ownIds = [ally.permanentId, sourceId];
      expect(ownWindows.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        fighter < 0 ? [ownIds] : [ownIds, ownIds],
      );
      expect(targetWindows.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        fighter < 0 ? [] : [targetIds],
      );
      const fighterDP = (fighter === 0 ? 13000 : 12000) + (boost === fighter ? 3000 : 0);
      const losesFighter = fighter >= 0 && fighterDP <= defenderDP[target]!;
      const losesTarget = fighter >= 0 && fighterDP >= defenderDP[target]!;
      const trashesSecurity = fighter === 1 && fighterDP > defenderDP[target]!;
      const checkedSecurity = entry === "attack" && !(losesFighter && fighter === 1);
      // A surviving Marsmon wins the security battle too (CR 14-2-1); its TS trigger can trash only once.
      const removedSecurity = checkedSecurity ? 2 : Number(trashesSecurity);
      expect(setup.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(Number(checkedSecurity));
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        ...(!losesFighter || fighter !== 0 ? [setup.inst("ally").instanceId] : []),
        setup.inst("tamer").instanceId,
        ...(!losesFighter || fighter !== 1 ? [marsmonId] : []),
      ]);
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId).sort()).toEqual(
        losesFighter
          ? (fighter === 0
              ? [setup.inst("ally").instanceId]
              : [marsmonId, ...(entry === "digivolve" ? [setup.inst("host").instanceId] : [])]
            ).sort()
          : [],
      );
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([
        ...targetIds.filter((_, index) => !losesTarget || index !== target),
        setup.perm("other-tamer").permanentId,
      ]);
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId).sort()).toEqual(
        [...(losesTarget ? [targetCardIds[target]] : []), ...originalSecurity.slice(0, removedSecurity)].sort(),
      );
      expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual(
        originalSecurity.slice(removedSecurity),
      );
      for (const unit of setup.state.players[seat]!.battleArea) {
        const index = ownIds.indexOf(unit.permanentId);
        if (index < 0) continue;
        expect(unit.currentDP).toBe((index === 0 ? 13000 : 12000) + (boost === index ? 3000 : 0));
        expect(unit.isSuspended).toBe(entry === "attack" && index === 1);
      }
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
        entry === "digivolve" ? [setup.inst("evolution-draw").instanceId] : [],
      );
      expect(setup.state.memory).toBe(entry === "digivolve" ? 6 : entry === "play" ? 3 : 10);
      const survivingMarsmon = setup.state.players[seat]!.battleArea.find(
        (unit) => unit.topCard.instanceId === marsmonId,
      );
      expect(survivingMarsmon?.stack.map((card) => card.instanceId)).toEqual(
        losesFighter && fighter === 1 ? undefined : entry === "digivolve" ? [setup.inst("host").instanceId] : [],
      );
      expect(setup.state.players[seat]!.breeding?.topCard.instanceId).toBe(setup.inst("own-breeding").instanceId);
      expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("other-breeding").instanceId);
    },
  );
});
