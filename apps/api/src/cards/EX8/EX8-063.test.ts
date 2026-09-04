import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-063.js";

describe("EX8-063", () => {
  it("registers the once-per-turn opponent discard-or-Fallen Angel effect when digivolving and attacking", () => {
    expect(compiled.effects.filter((entry) => entry.frequency === "OncePerTurn")).toHaveLength(3);
  });
  it("registers the once-per-turn opponent-hand-trash security watcher", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenHandTrashed" }],
    });
  });
  it("exposes the Barbamon-name evolution route for cost 1", () =>
    expect(digivolutionRequirementsFor("EX8-063")).toContainEqual({
      names: ["Barbamon"],
      cost: 1,
      isAlternate: true,
    }));
  it("trashes an opponent hand card on the digivolving branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-063", as: "source" }] },
        1: { hand: [{ card: "BT1-010", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => opponent.hand.length === 0);
    expect(opponent.hand).toHaveLength(0);
    expect(opponent.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId)).toBe(true);
  });
  it("trashes an opponent hand card on the attacking branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-063", as: "source" }] },
        1: { hand: [{ card: "BT1-010", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId)).toBe(true);
  });
  it("plays the exact eligible Fallen Angel from trash when the opponent has no hand card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-063", as: "source" }], trash: ["EX8-059", "BT1-010"] }, 1: { hand: [] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-059"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-059")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-059")).toBe(false);
  });

  it("accepts a cost-7 Fallen Angel and rejects a cost-8 peer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-063", as: "source" }], trash: ["BT11-083", "BT17-068", "BT1-010"] },
        1: { hand: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT11-083"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-068", "BT1-010"]),
    );
  });

  it("consumes the shared once-per-turn use when both players decline (Q4739)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-063", as: "source" }], trash: ["EX8-059"] },
      1: { hand: [{ card: "BT1-010", as: "opponentCard" }] },
    });
    const firstResolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const opponentDecline = s.state.pendingDecision!;
    const opponentSeat = s.decisions.at(-1)!.seat;
    expect(
      s.engine.applyIntent(opponentSeat, {
        type: "respondDecision",
        decisionId: opponentDecline.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== opponentDecline.decisionId,
    );
    const controllerDecline = s.state.pendingDecision!;
    const controllerSeat = s.decisions.at(-1)!.seat;
    expect(
      s.engine.applyIntent(controllerSeat, {
        type: "respondDecision",
        decisionId: controllerDecline.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firstResolution;
    const decisionCount = s.decisions.length;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.decisions).toHaveLength(decisionCount);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX8-059"]);
  });

  it.each([["X Antibody trait", "EX8-063", ["BT10-080"]]])(
    "trashes top security after opponent discard with the %s stack gate",
    async (_gate, hostCardId, under) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: hostCardId, as: "barbamonX", under }],
          },
          1: {
            hand: [{ card: "BT1-010", as: "discard" }],
            security: [{ card: "BT1-011", as: "security" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
      await settle(
        () =>
          s.state.players[1]!.security.length === 0 &&
          s.state.players[1]!.hand.length === 0 &&
          s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011"),
      );

      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT1-010", "BT1-011"]),
      );
    },
  );

  it("does not trash security without a Barbamon-name or X Antibody source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-063", as: "barbamonX", under: ["EX8-060"] }],
        },
        1: { hand: ["BT1-010"], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.state.players[1]!.hand[0]!.instanceId], 0);
    await settle(() => s.state.players[1]!.hand.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("ignores own-hand trash on a valid stack, suppresses a second opponent event, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-063", as: "barbamonX", under: ["BT10-080"] }],
          hand: [{ card: "BT1-009", as: "ownDiscard" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          hand: [
            { card: "BT1-010", as: "firstDiscard" },
            { card: "BT1-011", as: "sameTurnDiscard" },
            { card: "BT1-012", as: "nextTurnDiscard" },
          ],
          security: [
            { card: "BT1-013", as: "topSecurity" },
            { card: "BT1-014", as: "secondSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("ownDiscard").instanceId], 1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
      s.inst("secondSecurity").instanceId,
    ]);

    await advance(s.engine).verb.trash([s.inst("firstDiscard").instanceId], 0);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("topSecurity").instanceId)).toBe(true);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("secondSecurity").instanceId);

    await advance(s.engine).verb.trash([s.inst("sameTurnDiscard").instanceId], 0);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("secondSecurity").instanceId);

    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    await advance(s.engine).verb.trash([s.inst("nextTurnDiscard").instanceId], 0);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondSecurity").instanceId)).toBe(
      true,
    );
  });

  it("digivolves from Barbamon for the alternate cost 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-059", as: "barbamon" }],
        hand: [{ card: "EX8-063", as: "barbamonX" }],
      },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("barbamon").permanentId,
        instanceId: s.inst("barbamonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("barbamon").topCard.cardId === "EX8-063");

    expect(s.state.memory).toBe(0);
    expect(s.perm("barbamon").stack.map((card) => card.cardId)).toEqual(["EX6-059"]);
  });
});
