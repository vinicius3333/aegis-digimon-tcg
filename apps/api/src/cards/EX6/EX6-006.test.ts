import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { compiled } from "./EX6-006.js";
import "../EX10/EX10-074.js";

describe("EX6-006 Gate of Deadly Sins", () => {
  it("in breeding places an egg-deck card under itself, deletes your battle-area Digimon, and places under a Seven Great Demon Lords if deletion occurred", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      isBreeding: true,
      actions: [
        { kind: "PlaceUnder", fromEggDeck: true, target: { isSelf: true, filter: { isSelfRef: true } } },
        { kind: "Delete", target: { count: "all", filter: { controller: "mine", kind: ["Digimon"] } } },
        {
          kind: "PlaceUnder",
          from: ["trash"],
          underFilter: { isSelfRef: true },
          condition: { kind: "ifThisEffectActed" },
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }],
            },
          },
        },
      ],
    });
  });
  it("offers distinct-name gated Ogudomon revival and mutually exclusive inherited cost reductions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      isBreeding: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          condition: { kind: "selfDigivolutionStackDistinctNameCount", value: 7 },
          target: {
            count: 1,
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Ogudomon"] }] },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }],
          },
          amountChoices: [{ amount: 3 }, { amount: 4, condition: { value: 5 } }],
        },
      ],
    });
  });

  it("Q3694: deletes all of its controller's Digimon even when the Digi-Egg deck is empty", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX6-006", as: "gate" },
        battleArea: [{ card: "BT1-009", as: "victim" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.perm("gate").stack).toHaveLength(0);
  });

  it("places the top egg and a Seven Great Demon Lords card after deleting its Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate" },
          eggDeck: [{ card: "EX6-001", as: "egg" }],
          battleArea: [{ card: "BT1-009", as: "victim" }],
          trash: [{ card: "EX6-059", as: "lord" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("gate").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("egg").instanceId,
      s.inst("lord").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("lord").instanceId);
  });

  it("plays Ogudomon only after deleting a seven-distinct-name breeding stack", async () => {
    const stack = ["EX6-001", "EX6-007", "EX6-008", "EX6-009", "EX6-010", "EX6-011", "EX6-012"];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate", under: stack },
          trash: [{ card: "EX6-073", as: "ogudomon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ogudomon").instanceId)).toBe(
      true,
    );
  });

  it("does not revive Ogudomon from a six-card or duplicate-name stack", async () => {
    for (const stack of [
      ["EX6-001", "EX6-007", "EX6-008", "EX6-009", "EX6-010"],
      ["EX6-001", "EX6-007", "EX6-008", "EX6-009", "EX6-010", "EX6-010"],
    ]) {
      const s = setupEngine(
        {
          0: {
            breeding: { card: "EX6-006", as: "gate", under: stack },
            trash: [{ card: "EX6-073", as: "ogudomon" }],
          },
          1: { deck: ["BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      await advance(s.engine).runTurn(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ogudomon").instanceId)).toBe(
        false,
      );
    }
  });

  it("reduces a Seven Great Demon Lords play by 4 with five distinct stack names, otherwise by 3", async () => {
    const reduced = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "host", under: ["EX6-006", "EX6-056", "EX6-057", "EX6-058", "EX6-059"] },
          battleArea: [{ card: "EX6-056", as: "lord" }],
          hand: [
            { card: "EX10-074", as: "played" },
            { card: "EX10-074", as: "secondPlayed" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    reduced.state.memory = 8;
    await reduced.ready();
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === reduced.inst("played").instanceId),
    );
    expect(reduced.state.memory).toBe(5);

    const base = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "host", under: ["EX6-006", "EX6-056", "EX6-057", "EX6-058"] },
          battleArea: [{ card: "EX6-056", as: "lord" }],
          hand: [
            { card: "EX10-074", as: "played" },
            { card: "EX10-074", as: "secondPlayed" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    base.state.memory = 9;
    await base.ready();
    expect(base.engine.applyIntent(0, { type: "playCard", instanceId: base.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      base.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === base.inst("played").instanceId),
    );
    expect(base.state.memory).toBe(5);
  });

  it("projects the Gate reduction for affordability without consuming its optional choice", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "EX6-006",
            as: "gate",
            under: ["EX6-006", "EX6-056", "EX6-057", "EX6-058", { card: "EX6-059", as: "removed" }],
          },
          battleArea: [{ card: "EX6-056", as: "lord" }],
          hand: [
            { card: "EX10-074", as: "beelzemon" },
            { card: "EX10-074", as: "secondBeelzemon" },
            { card: "AD1-003", as: "nonLord" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = -7;
    await s.ready();
    // The native primitive seam models an effect-paid play while memory is negative;
    // a playCard intent cannot begin that processing state directly.
    const canAfford = await internalsOf(s.engine).primitives.canAffordEffectPlay!(s.inst("beelzemon").instanceId);
    expect(canAfford).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);
    expect(await internalsOf(s.engine).primitives.canAffordEffectPlay!(s.inst("nonLord").instanceId)).toBe(false);

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("gate").permanentId, [s.inst("removed").instanceId], 0);
    expect(await internalsOf(s.engine).primitives.canAffordEffectPlay!(s.inst("beelzemon").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);
    s.state.memory = -4;
    expect(await internalsOf(s.engine).primitives.canAffordEffectPlay!(s.inst("beelzemon").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);

    const [played] = await internalsOf(s.engine).primitives.playFromHand!([s.inst("beelzemon").instanceId], {
      payCost: true,
    });
    expect(played?.topCard?.instanceId).toBe(s.inst("beelzemon").instanceId);
    expect(s.state.memory).toBe(-8);
    s.state.memory = -6;
    expect(await internalsOf(s.engine).primitives.canAffordEffectPlay!(s.inst("secondBeelzemon").instanceId)).toBe(
      false,
    );
  });

  it("allows refusing the inherited reduction and then pays the full play cost", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "host", under: ["EX6-006", "EX6-056", "EX6-057", "EX6-058", "EX6-059"] },
          battleArea: [{ card: "EX6-056", as: "lord" }],
          hand: [
            { card: "EX10-074", as: "played" },
            { card: "EX10-074", as: "secondPlayed" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optionalDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlayed").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const secondOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const secondAmount = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondAmount.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondPlayed").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("consumes the inherited reduction once per turn and rearms on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate", under: ["EX6-006", "EX6-001", "EX6-007", "EX6-008", "EX6-009"] },
          eggDeck: Array(10).fill("EX6-001"),
          battleArea: [],
          hand: [
            { card: "EX10-074", as: "first" },
            { card: "EX10-074", as: "second" },
            { card: "EX10-074", as: "third" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.memory).toBe(-1);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("third").instanceId),
    );
    expect(s.state.memory).toBe(6);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
