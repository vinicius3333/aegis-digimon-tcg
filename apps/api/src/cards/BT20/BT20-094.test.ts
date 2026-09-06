import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-094.js";
import "./index.js";
import "./BT20-011.js";
import "./BT20-074.js";

describe("BT20-094 Emperor Dragon of Calamity", () => {
  it("reduces the optional Free Digimon trash play by 5 and then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 5, optional: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("reactively plays Dragon Mode from an exact Fighter Mode stack", () => {
    const reactive = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(reactive).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("reacts only when the opponent's security stack loses a card", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("naturally plays a Free Digimon from trash with the 5-cost reduction and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT10-071", as: "purpleSource" },
          ],
          hand: [{ card: "BT20-094", as: "option" }],
          trash: [{ card: "BT20-011", as: "freeDigimon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-011", "BT20-094"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it.each(["accept", "refuse", "sameTurn", "ownSecurity"] as const)(
    "resolves the reactive Delay window with a legal Fighter Mode source: %s",
    async (route) => {
      const options = { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true };
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-020", under: ["BT20-076"], as: "fighter" }],
            hand: [{ card: "BT20-094", as: "option" }, "BT1-010"],
            security: ["BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT1-027", dp: 5000, as: "opponent" }],
            security: ["BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        options,
      );
      const optionId = s.inst("option").instanceId;
      const dragonId = s.perm("fighter").stack[0]!.instanceId;
      s.state.memory = 10;
      const ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
      expect(s.state.memory).toBe(7);
      let activeTurn = ownTurn;
      let activeSeat: 0 | 1 = 0;
      if (route !== "sameTurn") {
        advance(s.engine).endMainPhaseIfOpen(0);
        await ownTurn;
        s.state.turnSeat = 1;
        s.state.memory = -s.state.memory;
        const opponentTurn = s.engine.runOneTurn();
        await advance(s.engine).waitForMainPhase(1);
        activeTurn = opponentTurn;
        activeSeat = 1;
        if (route !== "ownSecurity") {
          advance(s.engine).endMainPhaseIfOpen(1);
          await opponentTurn;
          s.state.turnSeat = 0;
          s.state.memory = -s.state.memory;
          activeTurn = s.engine.runOneTurn();
          activeSeat = 0;
          await advance(s.engine).waitForMainPhase(0);
        }
      }
      options.autoAcceptOptional = route !== "refuse";
      options.autoDeclineOptional = route === "refuse";
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(activeSeat, {
          type: "attack",
          attackerPermanentId: s.perm(activeSeat === 0 ? "fighter" : "opponent").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
      const accepted = route === "accept";
      expect(s.state.players[activeSeat === 0 ? 1 : 0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === dragonId)).toBe(accepted);
      expect(s.perm("fighter").stack.some((card) => card.instanceId === dragonId)).toBe(!accepted);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(!accepted);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(accepted);
      expect(s.state.memory).toBe(memoryBefore);
      advance(s.engine).endMainPhaseIfOpen(activeSeat);
      await activeTurn;
    },
  );

  it.each(["hand", "trash"] as const)(
    "plays a level-3 Free Digimon from %s in Security and adds itself to hand",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            security: [{ card: "BT20-094", as: "option" }],
            [zone]: [{ card: "BT20-009", as: "free" }],
            deck: ["BT1-010", "BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-027", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const optionId = s.inst("option").instanceId;
      const freeId = s.inst("free").instanceId;
      s.state.turnSeat = 1;
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === freeId)).toBe(true);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
      expect(s.state.memory).toBe(3);
    },
  );
});
